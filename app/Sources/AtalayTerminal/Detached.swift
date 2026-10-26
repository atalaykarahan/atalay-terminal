import AppKit

/// Every chat and terminal runs in a detached GNU screen session (`/usr/bin/screen`, ships with macOS) named
/// `atl-<id>`; its window is only a display attached to it. So the app can freeze, quit or crash and Claude
/// keeps working: on the next launch the windows attach again (MainWindowController.restoreSessions).
enum Detached {
    static let screen = "/usr/bin/screen"
    /// Each build keeps its own sessions, so it never attaches to or ends another's chats while both are open: the
    /// installed app `atl-`, the staging build (`STAGING=1 ./build-app.sh`) `atls-`, a development run (`./dev.sh`,
    /// unbundled) `atld-`.
    static let prefix: String = {
        guard let id = Bundle.main.bundleIdentifier else { return "atld-" }
        return id.hasSuffix(".staging") ? "atls-" : "atl-"
    }()

    /// The prefixes of every build, for finding a session another build of the app runs (to mirror it).
    static let allPrefixes = ["atl-", "atls-", "atld-"]

    static var available: Bool { FileManager.default.isExecutableFile(atPath: screen) }

    /// Shared by the session and the display attached to it. Each build has its own, so a newer build's settings never
    /// reach the installed app's sessions.
    static let rcPath: String = {
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        let url = base.appendingPathComponent(prefix == "atl-" ? "screenrc" : "screenrc-" + prefix.dropLast())
        let rc = """
        # Written by Atalay's Terminal for its chat sessions. The command key is Ctrl-^ so Ctrl-A reaches Claude.
        startup_message off
        escape ^^^^
        deflogin off
        defutf8 on
        defscrollback 20000
        term screen-256color
        termcapinfo xterm*|screen*|vt100* ti@:te@
        altscreen on
        defflow off
        vbell off
        msgwait 0

        """
        try? rc.write(to: url, atomically: true, encoding: .utf8)
        return url.path
    }()

    /// Starts a chat's shell (running Claude when `claudeArgs` is given) in a new detached session off the
    /// main thread; `done` gets false when screen couldn't start it.
    static func start(name: String, cwd: String, claudeArgs: [String]?, done: @escaping @MainActor (Bool) -> Void) {
        let shell = TerminalFactory.userShell()
        let shellArgs = TerminalFactory.shellArgs(shell, cwd: cwd, claudeArgs: claudeArgs)
        // screen 4.0 can't pass 24-bit colour through (it misreads those codes as reverse/dim), so let
        // Claude fall back to the 256 colours of TERM=screen-256color.
        var env = TerminalFactory.childEnvironmentDict()
        env.removeValue(forKey: "COLORTERM")
        let rc = rcPath
        DispatchQueue.global(qos: .userInitiated).async {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: screen)
            // The shell starts once the session has its window's size, at the top. screen starts a session at 80×24,
            // and growing it to the window's size moves the cursor down by the rows it adds, so a shell started there
            // drew its prompt mid-window: wait for the resize, then home the cursor.
            let waitForSize = "i=0; while [ \"$(stty size 2>/dev/null)\" = '24 80' ] && [ $i -lt 30 ]; do sleep 0.05; i=$((i+1)); done; "
                + "printf '\\033[H\\033[2J'; exec \"$@\""
            p.arguments = ["-c", rc, "-U", "-dmS", name, "/bin/sh", "-c", waitForSize, "sh", shell] + shellArgs
            p.currentDirectoryURL = URL(fileURLWithPath: cwd)
            p.environment = env
            var ok = false
            if (try? p.run()) != nil {
                p.waitUntilExit()
                ok = p.terminationStatus == 0
            }
            DispatchQueue.main.async { done(ok) }
        }
    }

    /// Arguments for a display attached to the session. `-A` fits the session to that display.
    static func attachArgs(_ name: String, fit: Bool = true) -> [String] {
        ["-c", rcPath, "-U"] + (fit ? ["-A"] : []) + ["-x", name]
    }

    /// Makes the session take its display's size. A window that attached while hidden (without `-A`, so
    /// the session kept its size) calls this once it is shown.
    static func fit(_ name: String) {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "fit"]
        try? p.run()
    }

    // MARK: history across restarts

    /// A window that attaches to a running session after the app restarted (an update, a quit) only gets what screen
    /// repaints: the rows on screen. So on quit each window's scrollback is kept here, and the new window takes it
    /// back before it attaches. (screen's own copy of the history, `hardcopy -h`, mangles every character past
    /// Latin-1: ğ, ş, box drawing, Claude's symbols.)
    private static let historyDir: URL = {
        let dir = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal/history")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    static func saveHistory(_ name: String, text: String, rows: Int) {
        let url = historyDir.appendingPathComponent(name + ".txt")
        try? ("\(rows)\n" + text).write(to: url, atomically: true, encoding: .utf8)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    /// The kept scrollback (without the rows that were on screen, which screen repaints), once: the file goes.
    static func takeHistory(_ name: String) -> [String] {
        let url = historyDir.appendingPathComponent(name + ".txt")
        defer { try? FileManager.default.removeItem(at: url) }
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return [] }
        var lines = text.components(separatedBy: "\n")
        guard let rows = Int(lines.removeFirst()) else { return [] }
        lines = lines.map { String($0.reversed().drop(while: { $0 == " " }).reversed()) }
        while lines.last?.isEmpty == true { lines.removeLast() }
        lines = Array(lines.dropLast(rows))
        while lines.first?.isEmpty == true { lines.removeFirst() }
        return Array(lines.suffix(10_000))
    }

    static func forgetHistory(_ name: String) {
        try? FileManager.default.removeItem(at: historyDir.appendingPathComponent(name + ".txt"))
    }

    /// Ends the session: screen closes it, then the shell and everything in it get a hangup. screen alone left
    /// the shell running (login started it), an orphan holding a pty after every ended chat.
    static func quit(_ name: String) {
        forgetHistory(name)
        let shell = shellPid(name)
        let p = Process()
        p.executableURL = URL(fileURLWithPath: screen)
        p.arguments = ["-S", name, "-X", "quit"]
        try? p.run()
        guard let shell else { return }
        hangUp(shell)
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 3) {
            if kill(shell, 0) == 0 { kill(shell, SIGKILL) }
        }
    }

    /// SIGHUP to a process and its descendants, deepest first.
    private static func hangUp(_ pid: Int32) {
        for child in Proc.children(of: pid) { hangUp(child) }
        kill(pid, SIGHUP)
    }

    // MARK: processes (libproc, no `ps`)

    /// The session name when `pid` is the screen daemon of one of our sessions (`anyBuild`: of any build's).
    private static func daemonName(_ pid: Int32, anyBuild: Bool = false) -> String? {
        guard Proc.name(pid) == "screen", let args = Proc.arguments(pid), let i = args.firstIndex(of: "-dmS"), i + 1 < args.count
        else { return nil }
        let name = args[i + 1]
        return (anyBuild ? allPrefixes : [prefix]).contains(where: name.hasPrefix) ? name : nil
    }

    private static let shells: Set<String> = ["zsh", "bash", "fish", "sh", "ksh", "tcsh", "csh"]

    /// The shell inside a session, i.e. Claude's parent process. screen starts it through login(1),
    /// which runs as root so its name can't be read: SCREEN -> login -> shell -> claude.
    private static func shellProcess(under daemon: Int32) -> Int32? {
        var level = Proc.children(of: daemon)
        for _ in 0..<2 {
            if let pid = level.first(where: { Proc.name($0).map(shells.contains) == true }) { return pid }
            level = level.flatMap { Proc.children(of: $0) }
        }
        return nil
    }

    private static func claudeProcess(under daemon: Int32) -> Int32? {
        var level = Proc.children(of: daemon)
        for _ in 0..<4 {
            if let pid = level.first(where: { Proc.name($0)?.hasPrefix("claude") == true }) { return pid } // p_comm is "claude.exe"
            level = level.flatMap { Proc.children(of: $0) }
        }
        return nil
    }

    /// The shell of a named session (maps live sessions to their window), a mirrored one's too.
    static func shellPid(_ name: String) -> Int32? {
        Proc.all().first(where: { daemonName($0, anyBuild: true) == name }).flatMap(shellProcess(under:))
    }

    struct RunningSession {
        let name: String
        /// The conversation of the Claude running in it; nil for a terminal where none runs.
        let sessionId: String?
        let claude: Bool
        let cwd: String
        let title: String
    }

    /// Sessions still running, e.g. after the app was restarted or force quit: chats (Claude running) and
    /// terminals (only the shell).
    static func runningSessions(registry: String) -> [RunningSession] {
        var out: [RunningSession] = []
        for daemon in Proc.all() {
            guard let name = daemonName(daemon) else { continue }
            if let claude = claudeProcess(under: daemon) {
                let reg = (try? Data(contentsOf: URL(fileURLWithPath: "\(registry)/\(claude).json")))
                    .flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
                let cwd = reg?["cwd"] as? String ?? HOME
                out.append(RunningSession(name: name, sessionId: reg?["sessionId"] as? String, claude: true, cwd: cwd,
                                          title: reg?["name"] as? String ?? (cwd as NSString).lastPathComponent))
            } else if let shell = shellProcess(under: daemon) {
                let cwd = Proc.cwd(shell) ?? HOME
                out.append(RunningSession(name: name, sessionId: nil, claude: false, cwd: cwd, title: (cwd as NSString).lastPathComponent))
            }
        }
        return out
    }

    /// Name of the session that hosts this process, if any (`anyBuild`: a session of another build too).
    static func sessionName(hosting pid: Int32, anyBuild: Bool = false) -> String? {
        var cur = pid
        for _ in 0..<8 {
            if let n = daemonName(cur, anyBuild: anyBuild) { return n }
            guard let parent = Proc.parent(cur), parent > 1 else { return nil }
            cur = parent
        }
        return nil
    }
}

/// A chat window's link to its detached session.
@MainActor
final class DetachedLink {
    let name: String
    private var cachedShell: Int32?

    init(name: String) { self.name = name }

    var shellPid: Int32? {
        if let cachedShell, kill(cachedShell, 0) == 0 { return cachedShell }
        cachedShell = Detached.shellPid(name)
        return cachedShell
    }
}
