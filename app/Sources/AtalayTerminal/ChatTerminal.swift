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

    nonisolated override func selectionChanged(source: Terminal) {
        super.selectionChanged(source: source)
        Task { @MainActor [weak self] in
            guard let self else { return }
            self.onSelection?(self.getSelection())
        }
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
        // The user's iTerm2 font when there is one (e.g. a Nerd Font with the prompt's icons); the colours are the
        // app's own (Theme.ansi).
        let look = ITermLook.current
        tv.font = look?.fontName.flatMap { NSFont(name: $0, size: fontSize) } ?? Theme.mono(fontSize)
        tv.nativeBackgroundColor = Theme.terminalBg
        tv.nativeForegroundColor = Theme.text
        // Glass window: the terminal lets the blurred background through.
        tv.backgroundOpacity = 0.28
        tv.caretColor = Theme.accent
        // Selection: a solid highlight with dark text on it. (Selected text is drawn in its own colour, black by
        // default, so the old see-through highlight hid the text it marked.)
        tv.selectedTextBackgroundColor = Theme.accent
        tv.selectedTextForegroundColor = NSColor(hex: 0x1A0D00)
        // Text never fades into its background (iTerm2's "minimum contrast", WCAG AA): light text on a line Claude's
        // diff paints bright green or red is darkened just enough to read.
        tv.minimumContrastRatio = 4.5
        // The mouse selects text rather than going to the program. Claude turns mouse tracking on, but Apple's screen
        // passes that on without its modern encoding (1006) and drops OSC 52 copies, so a drag reached Claude garbled
        // and nothing got selected. Native selection highlights and copies with ⌘C, as in iTerm2.
        tv.allowMouseReporting = false
        tv.installColors(Theme.ansi.map {
            SwiftTerm.Color(red8: UInt16(($0 >> 16) & 0xFF), green8: UInt16(($0 >> 8) & 0xFF), blue8: UInt16($0 & 0xFF))
        })
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
        env["TERM"] = "xterm-256color"
        env["COLORTERM"] = "truecolor"
        env["TERM_PROGRAM"] = "AtalaysTerminal"
        if env["LANG"] == nil { env["LANG"] = "en_US.UTF-8" }
        if env["HOME"] == nil { env["HOME"] = HOME }
        return env
    }
}

/// From the default profile of the user's iTerm2: its font and what its Option key does. Nil without iTerm2.
struct ITermLook {
    let fontName: String?
    /// iTerm2's "Option key sends": Normal types characters, Meta / Esc+ make it Meta.
    let optionAsMeta: Bool

    static let current: ITermLook? = {
        let domain = "com.googlecode.iterm2" as CFString
        guard let profiles = CFPreferencesCopyAppValue("New Bookmarks" as CFString, domain) as? [[String: Any]], !profiles.isEmpty
        else { return nil }
        let guid = CFPreferencesCopyAppValue("Default Bookmark Guid" as CFString, domain) as? String
        let p = profiles.first { $0["Guid"] as? String == guid } ?? profiles[0]
        // "MesloLGS-NF-Regular 13": the PostScript name, then the size.
        let font = (p["Normal Font"] as? String).map { $0.split(separator: " ").dropLast().joined(separator: " ") }
        return ITermLook(fontName: font, optionAsMeta: ((p["Option Key Sends"] as? NSNumber)?.intValue ?? 0) != 0)
    }()
}
