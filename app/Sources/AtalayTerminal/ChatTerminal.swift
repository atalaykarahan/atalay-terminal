import AppKit
import SwiftTerm
import UniformTypeIdentifiers

/// One chat: a pseudo-terminal running the user's login shell in the project folder, where Claude runs.
@MainActor
final class ChatTerminalView: LocalProcessTerminalView {
    var chatId = ""
    /// The shell inside this chat's detached session (0 when it has none), to tell which program is in front.
    var sessionShell: () -> Int32 = { 0 }
    /// The selected text after every change (nil when nothing is selected), and what ⌘C copied.
    var onSelection: ((String?) -> Void)?
    var onCopy: ((String) -> Void)?
    /// A click gave it the keyboard (its window dims the other split panes).
    var onFocus: (() -> Void)?
    /// The folder a relative path in the output is taken from (the session's), for ⌘-click.
    var workingDirectory: () -> String? = { nil }
    /// A file ⌘-clicked: Source Control's editor opens it (FileEditor.swift), at the line the path names; false when
    /// that's not a file the editor shows.
    var onOpenFile: ((URL, Int?, Int?) -> Bool)?
    /// The cursor's shape is the theme's (TerminalFactory.paint).
    var themedCursor = false

    /// A click or a drag goes to Claude when its full-screen view is in front and follows the mouse, as in iTerm2: Claude
    /// selects across its whole history, the selection staying on the text as it scrolls (when the drag reaches the
    /// window's edge too), and ⌘C copies it (copy). The terminal itself can only select what's on screen, and Claude's
    /// history isn't in its scrollback, so a selection there slid off the text as Claude scrolled. Shift-drag still
    /// selects on the terminal, ⌘-click still opens a link.
    private(set) var mouseToProgram = false

    /// A click, or a right-click for the menu, gives this pane the keyboard, as in iTerm2. The window doesn't do it by
    /// itself: the click lands on SwiftTerm's Metal view inside the terminal, which doesn't take the keyboard
    /// (MTKView.acceptsFirstResponder is false), so after ⌘D the pane left behind could be clicked but not typed into.
    private func takeKeyboard() {
        guard let window, window.firstResponder !== self else { return }
        window.makeFirstResponder(self)
    }

    override func mouseDown(with event: NSEvent) {
        takeKeyboard()
        // ⌥ (as in iTerm2) or ⇧ (SwiftTerm's) with the drag: the terminal's own selection.
        mouseToProgram = event.modifierFlags.intersection([.command, .option]).isEmpty && claudeInFront && (engine.map { $0.mouseMode != .off } ?? false)
        if mouseToProgram {
            // screen doesn't pass Claude's request for SGR reports (1006) on: without it the clicks reach Claude garbled.
            feed(text: "\u{1b}[?1006h")
            allowMouseReporting = true
        }
        super.mouseDown(with: event)
        onFocus?()
    }

    override func mouseUp(with event: NSEvent) {
        super.mouseUp(with: event)
        stopEdgeScroll()
        guard mouseToProgram else { return }
        mouseToProgram = false
        allowMouseReporting = false
    }

    // MARK: iTerm2's terminal keys

    /// ⌘K, Clear Buffer: the history goes and the screen clears, the program in front drawing itself again (Ctrl+L).
    func clearBuffer() {
        feed(text: "\u{1b}[3J")
        send(txt: "\u{0c}")
    }

    enum ScrollStep { case lineUp, lineDown, pageUp, pageDown, top, bottom }

    /// ⌘↑ ⌘↓, ⌘⇞ ⌘⇟, ⌘↖ ⌘↘: through the history, as in iTerm2. Claude's full-screen view keeps its own, so there they
    /// go to Claude as its scroll keys (the wheel, Page Up/Down, Ctrl+Home/End).
    func scrollBuffer(_ step: ScrollStep) {
        if claudeInFront, let t = engine, t.mouseMode != .off {
            feed(text: "\u{1b}[?1006h")
            let mid = "\(max(1, t.cols / 2));\(max(1, t.rows / 2))"
            switch step {
            case .lineUp: send(txt: "\u{1b}[<64;\(mid)M")
            case .lineDown: send(txt: "\u{1b}[<65;\(mid)M")
            case .pageUp: send(txt: "\u{1b}[5~")
            case .pageDown: send(txt: "\u{1b}[6~")
            case .top: send(txt: "\u{1b}[1;5H")
            case .bottom: send(txt: "\u{1b}[1;5F")
            }
            return
        }
        switch step {
        case .lineUp: scrollUp(lines: 1)
        case .lineDown: scrollDown(lines: 1)
        case .pageUp: pageUp()
        case .pageDown: pageDown()
        case .top: scrollUp(lines: 1_000_000)
        case .bottom: scrollDown(lines: 1_000_000)
        }
    }

    /// Right-click, as in iTerm2: copy, paste, find, clear, split. The pane clicked takes the keyboard first, so its
    /// Split and Paste act on it rather than on the pane that had the keyboard.
    override func menu(for event: NSEvent) -> NSMenu? {
        takeKeyboard()
        onFocus?()
        let menu = NSMenu()
        func item(_ title: String, _ action: Selector, _ target: AnyObject?, tag: Int = 0) {
            let i = NSMenuItem(title: title, action: action, keyEquivalent: "")
            i.target = target
            i.tag = tag
            menu.addItem(i)
        }
        if !(getSelection() ?? "").isEmpty { item("Copy", #selector(copy(_:)), self) }
        item("Paste", #selector(paste(_:)), self)
        item("Select All", #selector(selectAll(_:)), self)
        menu.addItem(.separator())
        item("Find…", #selector(performTextFinderAction(_:)), self, tag: NSTextFinder.Action.showFindInterface.rawValue)
        item("Clear Buffer", #selector(clearBufferAction), self)
        menu.addItem(.separator())
        // The app's own (AppDelegate), through the responder chain.
        item("Split Vertically", NSSelectorFromString("splitVertically"), nil)
        item("Split Horizontally", NSSelectorFromString("splitHorizontally"), nil)
        return menu
    }

    @objc private func clearBufferAction() { clearBuffer() }

    // A drag that goes to Claude, held past the top or the bottom edge, scrolls Claude's view under it as a terminal's
    // own selection scrolls its history (iTerm2): the wheel turns a notch or more at a time, faster the farther past the
    // edge, and the drag follows to the edge row, so Claude's selection grows with what comes into view. The mouse sends
    // nothing while it's held still, so a timer drives it.
    private var edgeTimer: Timer?
    private var edgePoint: CGPoint = .zero

    override func mouseDragged(with event: NSEvent) {
        super.mouseDragged(with: event)
        guard mouseToProgram else { return }
        edgePoint = convert(event.locationInWindow, from: nil)
        if edgeDistance(edgePoint) == 0 { stopEdgeScroll() } else if edgeTimer == nil { startEdgeScroll() }
    }

    /// How far past the top (negative) or the bottom (positive) of the view the pointer is, in points; 0 inside it.
    private func edgeDistance(_ p: CGPoint) -> CGFloat {
        let fromTop = isFlipped ? p.y : bounds.height - p.y
        if fromTop < 0 { return fromTop }
        if fromTop > bounds.height { return fromTop - bounds.height }
        return 0
    }

    private func startEdgeScroll() {
        // In .common modes: during a drag the run loop tracks the mouse, and default-mode timers wait.
        let timer = Timer(timeInterval: 0.08, repeats: true) { [weak self] _ in MainActor.assumeIsolated { self?.edgeTick() } }
        RunLoop.main.add(timer, forMode: .common)
        edgeTimer = timer
        edgeTick()
    }

    private func stopEdgeScroll() {
        edgeTimer?.invalidate()
        edgeTimer = nil
    }

    private func edgeTick() {
        let d = edgeDistance(edgePoint)
        guard mouseToProgram, d != 0, let t = engine else { return stopEdgeScroll() }
        let cols = max(t.cols, 1), rows = max(t.rows, 1)
        let col = max(1, min(cols, Int(edgePoint.x / (bounds.width / CGFloat(cols))) + 1))
        let row = d < 0 ? 1 : rows
        // SGR mouse reports: the wheel (64 up, 65 down), then the left button's drag (32) at the edge row.
        let notches = min(4, 1 + Int(abs(d) / 30))
        send(txt: String(repeating: "\u{1b}[<\(d < 0 ? 64 : 65);\(col);\(row)M", count: notches) + "\u{1b}[<32;\(col);\(row)M")
    }

    nonisolated override func selectionChanged(source: Terminal) {
        super.selectionChanged(source: source)
        Task { @MainActor [weak self] in
            guard let self else { return }
            self.onSelection?(self.getSelection())
        }
    }

    /// ⌘-click on a link: a web address opens in the browser; a text file in Source Control's editor (onOpenFile), as
    /// VS Code would open it; any other file in its app, as in iTerm2, unless it starts something (SafeOpen). Claude wraps its own
    /// text, so a long path it printed can sit on two or three lines the terminal doesn't know belong together: a
    /// piece that isn't a file is joined with the path text ending the line above or starting the line below.
    override func requestOpenLink(source: TerminalView, link: String, params: [String: String]) {
        if link.hasPrefix("file:"), let url = URL(string: link), url.isFileURL {
            open(FileTarget(url: url))
        } else if link.contains("://") || ["mailto:", "tel:"].contains(where: link.hasPrefix), let url = URL(string: link) {
            SafeOpen.open(url)
        } else if let target = fileTarget(link) ?? wholePath(around: link) {
            open(target)
        }
    }

    /// A file a path names, and the line and column it names with it ("file.swift:12:4").
    private struct FileTarget {
        let url: URL
        var line: Int?
        var column: Int?
    }

    private func open(_ target: FileTarget) {
        if onOpenFile?(target.url, target.line, target.column) != true { SafeOpen.file(target.url) }
    }

    /// The file `text` names (from the session's folder when relative), also as "file.swift:12" or "file.swift:12:4",
    /// or followed by a sentence's full stop or a closing bracket (the link takes those in).
    private func fileTarget(_ text: String) -> FileTarget? {
        var trimmed = text
        while let last = trimmed.last, ".,;:!?)]}'\"`".contains(last) { trimmed.removeLast() }
        return existingFile(text) ?? (trimmed == text || trimmed.isEmpty ? nil : existingFile(trimmed))
    }

    private func existingFile(_ text: String) -> FileTarget? {
        var path = (text as NSString).expandingTildeInPath
        if !path.hasPrefix("/") {
            guard let cwd = workingDirectory() else { return nil }
            path = (cwd as NSString).appendingPathComponent(path)
        }
        var numbers: [Int] = []
        if let line = path.range(of: #":[0-9]+(?::[0-9]+)?$"#, options: .regularExpression),
           !FileManager.default.fileExists(atPath: path) {
            numbers = path[line].split(separator: ":").compactMap { Int($0) }
            path = String(path[..<line.lowerBound])
        }
        guard FileManager.default.fileExists(atPath: path) else { return nil }
        return FileTarget(url: URL(fileURLWithPath: path), line: numbers.first, column: numbers.dropFirst().first)
    }

    /// The longest existing path that `piece`, found on screen, is part of, up to two lines above and below it.
    private func wholePath(around piece: String) -> FileTarget? {
        guard let terminal = engine else { return nil }
        let rows: [String] = terminal.terminalLock.withLock {
            (0..<terminal.rows).map { terminal.getLine(row: $0)?.translateToString(trimRight: true) ?? "" }
        }
        let tail = { (s: String) in String(s.reversed().prefix { !$0.isWhitespace }.reversed()) }
        let head = { (s: String) in String(s.drop { $0.isWhitespace }.prefix { !$0.isWhitespace }) }
        // A line that's nothing but path text goes on the path whole; otherwise it ends or starts it.
        let alone = { (s: String) in !s.isEmpty && !s.trimmingCharacters(in: .whitespaces).contains(" ") }
        var best: FileTarget?
        for (i, row) in rows.enumerated() {
            var from = row.startIndex
            while let r = row.range(of: piece, range: from..<row.endIndex) {
                from = r.upperBound
                let startsLine = row[..<r.lowerBound].allSatisfy(\.isWhitespace)
                let endsLine = row[r.upperBound...].allSatisfy(\.isWhitespace)
                var above = [""]
                if startsLine, i > 0 {
                    above.append(tail(rows[i - 1]))
                    if alone(rows[i - 1]), i > 1 { above.append(tail(rows[i - 2]) + head(rows[i - 1])) }
                }
                var below = [""]
                if endsLine, i + 1 < rows.count {
                    below.append(head(rows[i + 1]))
                    if alone(rows[i + 1]), i + 2 < rows.count { below.append(head(rows[i + 1]) + head(rows[i + 2])) }
                }
                for a in above {
                    for b in below where !(a.isEmpty && b.isEmpty) {
                        if let target = fileTarget(a + piece + b), target.url.path.count > best?.url.path.count ?? 0 { best = target }
                    }
                }
            }
        }
        return best
    }

    /// SwiftTerm keeps its engine to itself; ⌘-click reads the lines on screen from it.
    private var engine: Terminal? {
        var mirror: Mirror? = Mirror(reflecting: self)
        while let m = mirror {
            if let value = m.children.first(where: { $0.label == "terminal" })?.value { return value as? Terminal }
            mirror = m.superclassMirror
        }
        return nil
    }

    override func copy(_ sender: Any) {
        // Nothing selected on the terminal while Claude's full-screen view is in front: the selection is Claude's (a drag
        // goes to Claude, mouseDown), kept on the text as it scrolls. ⌘C asks Claude to copy it, with its own key for
        // that (Ctrl+Shift+C, in the keyboard protocol Claude reads), and the badge shows what landed on the clipboard.
        if (getSelection() ?? "").isEmpty, claudeInFront {
            let before = NSPasteboard.general.changeCount
            send(txt: "\u{1b}[99;6u")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
                guard NSPasteboard.general.changeCount != before, let text = NSPasteboard.general.string(forType: .string), !text.isEmpty else { return }
                self?.onCopy?(text)
            }
            return
        }
        super.copy(sender)
        if let text = getSelection(), !text.isEmpty { onCopy?(text) }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        registerForDraggedTypes([.fileURL])
    }

    /// Everything typed or pasted goes out through here: typing in a chat or terminal is work (Activity, for XP).
    override func send(source: TerminalView, data: ArraySlice<UInt8>) {
        Activity.work()
        super.send(source: source, data: data)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    // MARK: pasting like iTerm2

    // A paste goes in as one piece (bracketed: ESC[200~ … ESC[201~) when the program in front wants that, so a copied
    // paragraph reaches Claude as one message, not one per line, and a pasted picture path becomes an image. Programs
    // ask for it with mode 2004, but that request never gets here: Apple's screen 4.0, which hosts every session,
    // drops it. So the program in front decides: Claude and shells that understand pastes get them bracketed,
    // anything else (vim, a REPL, a running job) gets plain text as before.
    private static let bracketing: Set<String> = ["zsh", "fish", "nvim"]

    /// The process group in front on the session's terminal: the shell's foreground job, or the shell itself.
    private func foregroundGroup() -> Int32? {
        let shell = sessionShell()
        guard shell > 0 else { return nil }
        return Proc.foregroundGroup(shell)
    }

    private static func isInteractiveAI(_ pid: Int32) -> Bool {
        Proc.isClaude(pid) || Proc.otherAI(pid) != nil
    }

    private var claudeInFront: Bool { foregroundGroup().map(Self.isInteractiveAI) ?? false }

    /// Sets the emulator's bracketed-paste mode to what the program in front takes (only for detached sessions; a
    /// direct shell sends its own mode 2004).
    private func matchPasteMode() {
        guard let group = foregroundGroup(), let program = Proc.name(group) else { return }
        feed(text: Self.bracketing.contains(program) || Self.isInteractiveAI(group) ? "\u{1b}[?2004h" : "\u{1b}[?2004l")
    }

    override func paste(_ sender: Any) {
        let pb = NSPasteboard.general
        // Files copied in Finder paste as their paths, like iTerm2 (a picture's path becomes an image in Claude).
        if let urls = pb.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL], !urls.isEmpty {
            return pastePaths(urls.map(\.path))
        }
        // A copied picture with no text (a screenshot, an image copied in a browser): Claude takes it from the
        // clipboard on Ctrl-V.
        if pb.string(forType: .string) == nil, pb.canReadItem(withDataConformingToTypes: [UTType.image.identifier]) {
            if claudeInFront { send(txt: "\u{16}") }
            return
        }
        matchPasteMode()
        super.paste(sender)
    }

    /// Whether the mouse wheel goes to the program in front, for one wheel event: Claude's full-screen view follows the
    /// mouse and scrolls its own history with the wheel, as in iTerm2 (its history isn't in the terminal's scrollback).
    /// Clicks and drags stay with text selection. Claude asks for SGR mouse reports (mode 1006), which screen doesn't
    /// pass on, so the reports went in an encoding it doesn't read; the emulator is switched to SGR first. If Claude
    /// isn't following the mouse, the wheel scrolls the scrollback as usual.
    func wheelGoesToProgram() -> Bool {
        guard claudeInFront else { return false }
        feed(text: "\u{1b}[?1006h")
        return true
    }

    /// Shell-escaped paths, pasted like typed-in text but in one piece.
    func pastePaths(_ paths: [String]) {
        matchPasteMode()
        pasteText(paths.map(Self.shellEscaped).joined(separator: " ") + " ")
    }

    // Files and folders dropped on the terminal paste their paths, like iTerm2.

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        droppedPaths(sender).isEmpty ? [] : .copy
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        let paths = droppedPaths(sender)
        guard !paths.isEmpty else { return false }
        pastePaths(paths)
        window?.makeFirstResponder(self)
        return true
    }

    private func droppedPaths(_ info: NSDraggingInfo) -> [String] {
        let urls = info.draggingPasteboard.readObjects(forClasses: [NSURL.self], options: [.urlReadingFileURLsOnly: true]) as? [URL]
        return (urls ?? []).map(\.path)
    }

    private static let shellSpecial = Set(" \t\n\\'\"`$!&|;<>()[]{}*?#~^=")

    static func shellEscaped(_ path: String) -> String {
        String(path.flatMap { shellSpecial.contains($0) ? ["\\", $0] : [$0] })
    }
}

@MainActor
enum TerminalFactory {
    static func make(chatId: String, cwd: String, claudeArgs: [String]?, fontSize: CGFloat,
                     delegate: LocalProcessTerminalViewDelegate) -> ChatTerminalView {
        let tv = styled(chatId: chatId, fontSize: fontSize, delegate: delegate)
        start(tv, cwd: cwd, claudeArgs: claudeArgs)
        return tv
    }

    static func start(_ tv: ChatTerminalView, cwd: String, claudeArgs: [String]?) {
        let shell = userShell()
        tv.startProcess(executable: shell, args: shellArgs(shell, cwd: cwd, claudeArgs: claudeArgs), environment: childEnvironment(),
                        execName: nil, currentDirectory: cwd)
    }

    /// The user's login shell in `cwd`. With `claudeArgs` it runs Claude first and stays when Claude exits;
    /// without, it is a plain terminal (where Claude can be started or resumed by hand).
    nonisolated static func shellArgs(_ shell: String, cwd: String, claudeArgs: [String]?) -> [String] {
        guard let claudeArgs else { return ["-il"] }
        // Antigravity's and Codex's own command lines (a saved conversation opened from the chats list), else Claude's.
        let cmd = (["agy", "codex"].contains(claudeArgs.first) ? claudeArgs : ["claude"] + claudeArgs).map(shellQuote).joined(separator: " ")
        return ["-ilc", "cd -- \(shellQuote(cwd)) && \(cmd); exec \(shellQuote(shell)) -il"]
    }

    /// The theme's colours (ThemeStore): when a terminal is made, and again when the theme changes.
    static func paint(_ tv: ChatTerminalView) {
        // See-through: the window's own background is the terminal's (ChatWindowController.windowOpacity), so the
        // header and every pane share one opacity. SwiftTerm keeps a terminal's opacity in its background colour's
        // alpha: the theme's colour as it is made the terminals solid (how the see-through went with the themes).
        tv.nativeBackgroundColor = Theme.terminalBg.withAlphaComponent(0)
        tv.nativeForegroundColor = Theme.text
        tv.caretColor = Theme.terminalCursor
        tv.caretTextColor = Theme.terminalCaretText
        // Selection: a solid highlight with text that reads on it. (Selected text is drawn in its own colour, black by
        // default, so the old see-through highlight hid the text it marked.)
        tv.selectedTextBackgroundColor = Theme.terminalSelection
        tv.selectedTextForegroundColor = Theme.terminalSelectionText
        tv.linkColor = Theme.terminalLink
        tv.installColors(Theme.ansi.map {
            SwiftTerm.Color(red8: UInt16(($0 >> 16) & 0xFF), green8: UInt16(($0 >> 8) & 0xFF), blue8: UInt16($0 & 0xFF))
        })
        // The cursor: the theme's when it asks for one, and back to the user's iTerm2 one after such a theme. Otherwise
        // left as it is (a program may have set its own).
        let usual = ITermLook.current?.cursorStyle ?? TerminalOptions.default.cursorStyle
        if let style = cursor(ThemeStore.shared.tokens, else: usual) {
            tv.setCursorStyle(style)
            tv.themedCursor = true
        } else if tv.themedCursor {
            tv.setCursorStyle(usual)
            tv.themedCursor = false
        }
    }

    /// The cursor a theme asks for: `--cursor-style` (block, bar or underline) and `--cursor-blink` (1 or 0), what it
    /// leaves out as in `base`. Nil when it asks for neither.
    static func cursor(_ tokens: [String: String], else base: CursorStyle) -> CursorStyle? {
        let token = { (k: String) in tokens[k]?.trimmingCharacters(in: .whitespaces) }
        let shape = token("--cursor-style").flatMap { ["block", "bar", "underline"].contains($0) ? $0 : nil }
        let blink = token("--cursor-blink").flatMap { ["1": true, "0": false][$0] }
        guard shape != nil || blink != nil else { return nil }
        let was = [.blinkBar, .steadyBar].contains(base) ? "bar" : [.blinkUnderline, .steadyUnderline].contains(base) ? "underline" : "block"
        let on = blink ?? [.blinkBlock, .blinkBar, .blinkUnderline].contains(base)
        switch shape ?? was {
        case "bar": return on ? .blinkBar : .steadyBar
        case "underline": return on ? .blinkUnderline : .steadyUnderline
        default: return on ? .blinkBlock : .steadyBlock
        }
    }

    private static func styled(chatId: String, fontSize: CGFloat, delegate: LocalProcessTerminalViewDelegate) -> ChatTerminalView {
        let tv = ChatTerminalView(frame: NSRect(x: 0, y: 0, width: 960, height: 600))
        tv.chatId = chatId
        // The user's iTerm2 font when there is one (e.g. a Nerd Font with the prompt's icons), its size and cursor; the
        // colours are the app's own (Theme.ansi).
        let look = ITermLook.current
        tv.font = look?.fontName.flatMap { NSFont(name: $0, size: fontSize) } ?? Theme.mono(fontSize)
        // Text never fades into its background (iTerm2's "minimum contrast", WCAG AA): light text on a line Claude's
        // diff paints green or red is darkened just enough to read.
        tv.minimumContrastRatio = 4.5
        if let style = look?.cursorStyle { tv.setCursorStyle(style) }
        // The mouse selects text on the terminal unless Claude's full-screen view is in front: then a click, a drag or
        // the wheel goes to Claude, one gesture at a time, with the SGR encoding it asks for (ChatTerminalView.mouseDown,
        // AppDelegate's wheel monitor).
        tv.allowMouseReporting = false
        paint(tv)
        // Colours 16–255 as iTerm2 has them, xterm's fixed cube and grey ramp. SwiftTerm otherwise derives them from the
        // 16, and through screen Claude and the prompt draw in these 256.
        tv.ansi256PaletteStrategy = .xterm
        tv.changeScrollback(10_000)
        // Option types characters (on a Turkish keyboard @ # { } [ ] | \ ~ all need it), as in iTerm2's default;
        // Meta only when the user's iTerm2 profile makes Option send it.
        tv.optionAsMetaKey = look?.optionAsMeta ?? false
        tv.processDelegate = delegate
        // SwiftTerm pauses drawing while it thinks the window is hidden. Our chat windows open behind a
        // squeezed CRT effect and as child windows, and the pause sometimes never lifted: output arrived
        // but the window stayed blank until a keypress.
        tv.suspendsRenderingWhenNotVisible = false
        return tv
    }

    nonisolated static func userShell() -> String {
        if let pw = getpwuid(getuid()), let sh = pw.pointee.pw_shell {
            let s = String(cString: sh)
            if !s.isEmpty, FileManager.default.isExecutableFile(atPath: s) { return s }
        }
        return "/bin/zsh"
    }

    /// A chat window that becomes a display of its detached session (see Detached) once `attach` runs.
    static func makeIdle(chatId: String, fontSize: CGFloat, delegate: LocalProcessTerminalViewDelegate) -> ChatTerminalView {
        styled(chatId: chatId, fontSize: fontSize, delegate: delegate)
    }

    /// `fit` makes the session take this terminal's size; a hidden window attaches without resizing it. screen runs
    /// behind the app's own relay, which gives Claude's frames back the marks screen drops (SyncRelay).
    static func attach(_ tv: ChatTerminalView, screenName: String, cwd: String, fit: Bool) {
        let relay = Bundle.main.executablePath ?? CommandLine.arguments[0]
        tv.startProcess(executable: relay, args: ["--sync-relay", Detached.screen] + Detached.attachArgs(screenName, fit: fit),
                        environment: childEnvironment(), execName: nil, currentDirectory: cwd)
    }

    nonisolated static func shellQuote(_ s: String) -> String {
        "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'"
    }

    /// The app's environment minus anything that would make Claude think it runs inside another terminal or Claude.
    nonisolated static func childEnvironment() -> [String] {
        childEnvironmentDict().map { "\($0.key)=\($0.value)" }
    }

    nonisolated static func childEnvironmentDict() -> [String: String] {
        var env = ProcessInfo.processInfo.environment
        // Started from a Codex command (a staging build it launched), the app had Codex's tool environment: NO_COLOR
        // turned every chat's Claude white, and its C.UTF-8 locale and pagers reached the shells. The login shell sets
        // whatever the user really wants again.
        for key in env.keys where key.hasPrefix("ITERM_") || key.hasPrefix("CLAUDECODE") || key.hasPrefix("CLAUDE_CODE_")
            || key.hasPrefix("CODEX_")
            || ["TERM_SESSION_ID", "LC_TERMINAL", "LC_TERMINAL_VERSION", "TERM_PROGRAM_VERSION", "OLDPWD",
                "NO_COLOR", "LC_ALL", "LC_CTYPE", "GIT_PAGER", "GH_PAGER"].contains(key) {
            env.removeValue(forKey: key)
        }
        // Claude's full-screen renderer keeps the whole conversation scrollable inside Claude (the wheel goes there,
        // ChatTerminalView.wheelGoesToProgram). The classic one redraws by clearing the screen whenever its output
        // outgrows the window: iTerm2 keeps the cleared rows in its scrollback, screen and this emulator don't, so the
        // top of a conversation kept vanishing. Which one Claude picks is otherwise up to a rollout on Anthropic's side;
        // a user who chose the classic one (/tui default) keeps it.
        if claudeTUI() != "default" { env["CLAUDE_CODE_NO_FLICKER"] = "1" }
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["TERM_PROGRAM"] = "AtalaysTerminal"
        if env["LANG"] == nil { env["LANG"] = "en_US.UTF-8" }
        if env["HOME"] == nil { env["HOME"] = HOME }
        // The app's rtk (TokenSavers), last, so one of the user's own comes first.
        env["PATH"] = (env["PATH"] ?? "/usr/bin:/bin:/usr/sbin:/sbin") + ":" + TokenSavers.binDir.path
        return env
    }
}

/// The renderer the user picked in Claude Code (`/tui`, "tui" in its settings.json): "fullscreen", "default" or nil.
nonisolated func claudeTUI() -> String? {
    guard let data = FileManager.default.contents(atPath: CLAUDE_DIR + "/settings.json"),
          let settings = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
    return settings["tui"] as? String
}

/// From the default profile of the user's iTerm2: its font and what its Option key does. Nil without iTerm2.
/// The user's default iTerm2 profile, read once at launch: its font and size, the cursor's shape and what Option sends,
/// so typing here feels as it does there. Nil without iTerm2.
struct ITermLook {
    let fontName: String?
    let fontSize: CGFloat?
    /// iTerm2's "Option key sends": Normal types characters, Meta / Esc+ make it Meta.
    let optionAsMeta: Bool
    let cursorStyle: CursorStyle

    static let current: ITermLook? = {
        let domain = "com.googlecode.iterm2" as CFString
        guard let profiles = CFPreferencesCopyAppValue("New Bookmarks" as CFString, domain) as? [[String: Any]], !profiles.isEmpty
        else { return nil }
        let guid = CFPreferencesCopyAppValue("Default Bookmark Guid" as CFString, domain) as? String
        let p = profiles.first { $0["Guid"] as? String == guid } ?? profiles[0]
        let number = { (key: String) in (p[key] as? NSNumber)?.doubleValue }
        // "MesloLGS-NF-Regular 13": the PostScript name, then the size.
        let fontParts = (p["Normal Font"] as? String)?.split(separator: " ")
        // "Cursor Type": 0 underline, 1 vertical bar, 2 box (iTerm2's default).
        let blink = (p["Blinking Cursor"] as? NSNumber)?.boolValue == true
        let cursor: CursorStyle = switch Int(number("Cursor Type") ?? 2) {
        case 0: blink ? .blinkUnderline : .steadyUnderline
        case 1: blink ? .blinkBar : .steadyBar
        default: blink ? .blinkBlock : .steadyBlock
        }
        return ITermLook(fontName: fontParts.map { $0.dropLast().joined(separator: " ") },
                         fontSize: fontParts?.last.flatMap { Double($0) }.map { CGFloat($0) },
                         optionAsMeta: Int(number("Option Key Sends") ?? 0) != 0,
                         cursorStyle: cursor)
    }()
}
