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

    override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)
        onFocus?()
    }

    nonisolated override func selectionChanged(source: Terminal) {
        super.selectionChanged(source: source)
        Task { @MainActor [weak self] in
            guard let self else { return }
            self.onSelection?(self.getSelection())
        }
    }

    /// ⌘-click on a link: a web address opens in the browser, a file in its app, as in iTerm2. Claude wraps its own
    /// text, so a long path it printed can sit on two or three lines the terminal doesn't know belong together: a
    /// piece that isn't a file is joined with the path text ending the line above or starting the line below.
    override func requestOpenLink(source: TerminalView, link: String, params: [String: String]) {
        if link.contains("://") || ["mailto:", "tel:", "file:"].contains(where: link.hasPrefix), let url = URL(string: link) {
            NSWorkspace.shared.open(url)
        } else if let url = fileURL(link) ?? wholePath(around: link) {
            NSWorkspace.shared.open(url)
        }
    }

    /// The file `text` names (from the session's folder when relative), also as "file.swift:12" or "file.swift:12:4",
    /// or followed by a sentence's full stop or a closing bracket (the link takes those in).
    private func fileURL(_ text: String) -> URL? {
        var trimmed = text
        while let last = trimmed.last, ".,;:!?)]}'\"`".contains(last) { trimmed.removeLast() }
        return existingFile(text) ?? (trimmed == text || trimmed.isEmpty ? nil : existingFile(trimmed))
    }

    private func existingFile(_ text: String) -> URL? {
        var path = (text as NSString).expandingTildeInPath
        if !path.hasPrefix("/") {
            guard let cwd = workingDirectory() else { return nil }
            path = (cwd as NSString).appendingPathComponent(path)
        }
        if let line = path.range(of: #":[0-9]+(?::[0-9]+)?$"#, options: .regularExpression),
           !FileManager.default.fileExists(atPath: path) {
            path = String(path[..<line.lowerBound])
        }
        return FileManager.default.fileExists(atPath: path) ? URL(fileURLWithPath: path) : nil
    }

    /// The longest existing path that `piece`, found on screen, is part of, up to two lines above and below it.
    private func wholePath(around piece: String) -> URL? {
        guard let terminal = engine else { return nil }
        let rows: [String] = terminal.terminalLock.withLock {
            (0..<terminal.rows).map { terminal.getLine(row: $0)?.translateToString(trimRight: true) ?? "" }
        }
        let tail = { (s: String) in String(s.reversed().prefix { !$0.isWhitespace }.reversed()) }
        let head = { (s: String) in String(s.drop { $0.isWhitespace }.prefix { !$0.isWhitespace }) }
        // A line that's nothing but path text goes on the path whole; otherwise it ends or starts it.
        let alone = { (s: String) in !s.isEmpty && !s.trimmingCharacters(in: .whitespaces).contains(" ") }
        var best: URL?
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
                        if let url = fileURL(a + piece + b), url.path.count > best?.path.count ?? 0 { best = url }
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
    private static let bracketing: Set<String> = ["claude", "claude.exe", "zsh", "fish", "nvim"]

    private func foregroundProgram() -> String? {
        let shell = sessionShell()
        guard shell > 0, let group = Proc.foregroundGroup(shell) else { return nil }
        return Proc.name(group)
    }

    /// Sets the emulator's bracketed-paste mode to what the program in front takes (only for detached sessions; a
    /// direct shell sends its own mode 2004).
    private func matchPasteMode() {
        guard let program = foregroundProgram() else { return }
        feed(text: Self.bracketing.contains(program) ? "\u{1b}[?2004h" : "\u{1b}[?2004l")
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
            if foregroundProgram()?.hasPrefix("claude") == true { send(txt: "\u{16}") }
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
        guard foregroundProgram()?.hasPrefix("claude") == true else { return false }
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
        let claude = (["claude"] + claudeArgs).map(shellQuote).joined(separator: " ")
        return ["-ilc", "cd -- \(shellQuote(cwd)) && \(claude); exec \(shellQuote(shell)) -il"]
    }

    private static func styled(chatId: String, fontSize: CGFloat, delegate: LocalProcessTerminalViewDelegate) -> ChatTerminalView {
        let tv = ChatTerminalView(frame: NSRect(x: 0, y: 0, width: 960, height: 600))
        tv.chatId = chatId
        // The user's iTerm2 font when there is one (e.g. a Nerd Font with the prompt's icons), its size and cursor; the
        // colours are the app's own (Theme.ansi).
        let look = ITermLook.current
        tv.font = look?.fontName.flatMap { NSFont(name: $0, size: fontSize) } ?? Theme.mono(fontSize)
        tv.nativeBackgroundColor = Theme.terminalBg
        tv.nativeForegroundColor = Theme.text
        // Glass window, but text first: readable terminals stay around 80% opaque over a blurred background (10–20%
        // see-through); at 28% the busy dashboard behind made the text tiring to read. With the window's warm tint
        // and frost this lands near that (ChatWindowController.buildLayout).
        tv.backgroundOpacity = 0.6
        tv.caretColor = Theme.terminalCursor
        tv.caretTextColor = NSColor(hex: 0x1A0D00)
        // Selection: a solid highlight with dark text on it. (Selected text is drawn in its own colour, black by
        // default, so the old see-through highlight hid the text it marked.)
        tv.selectedTextBackgroundColor = Theme.terminalCursor
        tv.selectedTextForegroundColor = NSColor(hex: 0x1A0D00)
        tv.linkColor = Theme.terminalLink
        // Text never fades into its background (iTerm2's "minimum contrast", WCAG AA): light text on a line Claude's
        // diff paints green or red is darkened just enough to read.
        tv.minimumContrastRatio = 4.5
        if let style = look?.cursorStyle { tv.setCursorStyle(style) }
        // The mouse selects text rather than going to the program. Claude turns mouse tracking on, but Apple's screen
        // passes that on without its modern encoding (1006) and drops OSC 52 copies, so a drag reached Claude garbled
        // and nothing got selected. Native selection highlights and copies with ⌘C, as in iTerm2.
        tv.allowMouseReporting = false
        tv.installColors(Theme.ansi.map {
            SwiftTerm.Color(red8: UInt16(($0 >> 16) & 0xFF), green8: UInt16(($0 >> 8) & 0xFF), blue8: UInt16($0 & 0xFF))
        })
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

    /// `fit` makes the session take this terminal's size; a hidden window attaches without resizing it.
    static func attach(_ tv: ChatTerminalView, screenName: String, cwd: String, fit: Bool) {
        tv.startProcess(executable: Detached.screen, args: Detached.attachArgs(screenName, fit: fit),
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
        for key in env.keys where key.hasPrefix("ITERM_") || key.hasPrefix("CLAUDECODE") || key.hasPrefix("CLAUDE_CODE_")
            || ["TERM_SESSION_ID", "LC_TERMINAL", "LC_TERMINAL_VERSION", "TERM_PROGRAM_VERSION", "OLDPWD"].contains(key) {
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
        return env
    }
}

/// The renderer the user picked in Claude Code (`/tui`, "tui" in its settings.json): "fullscreen", "default" or nil.
nonisolated func claudeTUI() -> String? {
    let dir = ProcessInfo.processInfo.environment["CLAUDE_CONFIG_DIR"] ?? (HOME as NSString).appendingPathComponent(".claude")
    guard let data = FileManager.default.contents(atPath: dir + "/settings.json"),
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
