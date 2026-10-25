import AppKit

/// The original of a copied chat: Claude still running in an iTerm2 tab. Ending the copy ends it too and
/// closes that tab, so nothing is left behind.
struct ITermOrigin {
    let tty: String
    let claude: Int32
}

/// The little the app does with the user's own iTerm2 sessions.
enum ITerm {
    /// The iTerm2 terminal (tty) a process runs in, when its terminal is iTerm2's
    /// (claude -> shell -> login -> iTermServer -> iTerm2).
    static func tab(of pid: Int32) -> String? {
        guard let tty = Proc.info(pid)?.tty else { return nil }
        var cur = pid
        for _ in 0..<6 {
            guard let parent = Proc.parent(cur), parent > 1 else { return nil }
            if Proc.name(parent)?.hasPrefix("iTerm") == true { return tty }
            cur = parent
        }
        return nil
    }

    /// Stops the original Claude (SIGTERM, so it exits cleanly) and then closes its iTerm2 session. Past 5 s
    /// the close goes ahead anyway: iTerm2 doesn't ask when a script closes a session, and the hangup ends
    /// whatever still runs there. Never starts iTerm2.
    static func end(_ origin: ITermOrigin) {
        let pid = origin.claude
        kill(pid, SIGTERM)
        let script = """
        on run argv
            tell application "iTerm2"
                repeat with w in windows
                    repeat with t in tabs of w
                        repeat with s in sessions of t
                            if tty of s is (item 1 of argv) then
                                close s
                                return
                            end if
                        end repeat
                    end repeat
                end repeat
            end tell
        end run
        """
        DispatchQueue.global(qos: .userInitiated).async {
            var step = 0
            while kill(pid, 0) == 0, step < 50 {
                step += 1
                if step == 25 { kill(pid, SIGTERM) }
                Thread.sleep(forTimeInterval: 0.1)
            }
            guard !NSRunningApplication.runningApplications(withBundleIdentifier: "com.googlecode.iterm2").isEmpty else { return }
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
            p.arguments = ["-e", script, origin.tty]
            p.standardOutput = FileHandle.nullDevice
            p.standardError = FileHandle.nullDevice
            try? p.run()
        }
    }
}
