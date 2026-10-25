import AppKit
import SwiftTerm

/// One chat: a pseudo-terminal running the user's login shell in the project folder, where Claude runs.
@MainActor
final class ChatTerminalView: LocalProcessTerminalView {
    var chatId = ""

    override init(frame: CGRect) {
        super.init(frame: frame)
        registerForDraggedTypes([.fileURL])
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    // Files and folders dropped on the terminal type their paths, escaped for the shell, like iTerm2.

    override func draggingEntered(_ sender: NSDraggingInfo) -> NSDragOperation {
        droppedPaths(sender).isEmpty ? [] : .copy
    }

    override func performDragOperation(_ sender: NSDraggingInfo) -> Bool {
        let paths = droppedPaths(sender)
        guard !paths.isEmpty else { return false }
        pasteText(paths.map(Self.shellEscaped).joined(separator: " ") + " ")
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
        tv.font = Theme.mono(fontSize)
        tv.nativeBackgroundColor = Theme.terminalBg
        tv.nativeForegroundColor = Theme.text
        // Glass window: the terminal lets the blurred background through.
        tv.backgroundOpacity = 0.28
        tv.caretColor = Theme.accent
        tv.selectedTextBackgroundColor = NSColor(hex: Theme.accentHex, alpha: 0.34)
        tv.installColors(Theme.ansi.map {
            SwiftTerm.Color(red8: UInt16(($0 >> 16) & 0xFF), green8: UInt16(($0 >> 8) & 0xFF), blue8: UInt16($0 & 0xFF))
        })
        tv.changeScrollback(10_000)
        tv.optionAsMetaKey = true
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
