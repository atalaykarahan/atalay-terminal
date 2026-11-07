import Darwin
import Foundation

/// Runaway processes: one of yours left burning a CPU core where nobody sees it. Its parent is gone (it hangs off
/// launchd now), it has no terminal and it isn't an app: a shell's leftover helper (powerlevel10k's once kept a core at
/// 100% for 17 hours after its terminal closed), a stuck script. Half a core or more for two minutes makes it one. The
/// dashboard sounds the alarm and the orbit shows it as a meteor; ending it is a click. Read from the kernel every few
/// seconds as Activity Monitor does, with no admin rights.
@MainActor
final class Runaways {
    struct Item: Encodable {
        let pid: Int32
        let name: String
        let cmd: String
        /// % of one core over the last few seconds.
        let cpu: Double
        /// When it went over the line, and when it started (ms since 1970). End checks the start, so a later process
        /// with the same pid is never touched.
        let since: Double
        let started: Double
        /// Seconds of CPU it has used in all.
        let cpuTime: Double
    }

    /// Left behind by a terminal that closed: a dev server still holding its port after its tab went (remotion studio
    /// kept :3000 for hours that way). The session it ran in has no leader any more (its shell is gone) and it hangs off
    /// launchd. The orbit shows it as a car whatever it burns, and ending it is a click there.
    struct Left {
        let pid: Int32
        /// ms since 1970, as Item's.
        let started: Double
        let args: [String]
        let cwd: String
    }

    private(set) var left: [Left] = []

    private static let line = 50.0
    static var sustain: Double = 120
    private static let every: TimeInterval = 5

    var onChange: ((String) -> Void)?
    /// Live AI sessions `(cwd, started ms)` from the engine, so background work a live session started isn't mistaken
    /// for a leftover from a closed terminal.
    var liveSessions: [LiveSession] = []
    struct LiveSession {
        let cwd: String
        let started: Double
        let busy: Bool
    }
    private(set) var json = "[]"
    private var last: [Int32: (started: UInt64, cpu: UInt64, at: Double)] = [:]
    private var over: [Int32: Double] = [:]
    private var timer: Timer?

    /// System daemons, XPC services and app bundles are macOS / Activity Monitor's business, never a shell's leftover or
    /// runaway script. (macOS ships the `python3` CLI interpreter inside `Python.app`, so keep Python scripts eligible.)
    static func isExcluded(path: String, name: String?) -> Bool {
        if path.hasPrefix("/System/") || path.hasPrefix("/usr/libexec/") || path.hasPrefix("/usr/sbin/")
            || path.hasPrefix("/Library/Apple/") || path.hasPrefix("/Library/Application Support/Apple/") {
            return true
        }
        if path.contains(".xpc/") || path.contains(".appex/") {
            return true
        }
        let base = name ?? (path as NSString).lastPathComponent
        if base.hasPrefix("com.apple.") || path.contains("/com.apple.") {
            return true
        }
        if path.contains("/Python.app/Contents/MacOS/Python") {
            return false
        }
        if path.contains(".app/") {
            return true
        }
        return false
    }

    static func inFolder(_ dir: String, of root: String) -> Bool {
        let d = dir.hasSuffix("/") && dir.count > 1 ? String(dir.dropLast()) : dir
        let r = root.hasSuffix("/") && root.count > 1 ? String(root.dropLast()) : root
        guard !d.isEmpty, !r.isEmpty, r != "/" else { return false }
        if d == r { return true }
        return r != HOME && d.hasPrefix(r + "/")
    }

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: Self.every, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.sample() }
        }
    }

    func sample() {
        let me = getuid(), now = ProcessInfo.processInfo.systemUptime, wall = Date().timeIntervalSince1970 * 1000
        let pids = Proc.all(), alive = Set(pids)
        var infos: [Int32: Proc.Info] = [:]
        var children: [Int32: [Int32]] = [:]
        for pid in pids where pid > 1 {
            guard let info = Proc.info(pid), info.uid == me else { continue }
            infos[pid] = info
            if info.ppid > 1 { children[info.ppid, default: []].append(pid) }
        }

        // Live AI sessions in terminals (besides those MainWindowController passed from RadarEngine), so background work
        // a live session started in its project folder isn't mistaken for a leftover from a closed terminal.
        var sessions = liveSessions
        for (pid, info) in infos where info.tty != nil {
            if Proc.isClaude(pid) || Proc.otherAI(pid) != nil, let cwd = Proc.cwd(pid), !cwd.isEmpty,
               !sessions.contains(where: { $0.cwd == cwd }) {
                sessions.append(LiveSession(cwd: cwd, started: Double(info.started / 1000), busy: true))
            }
        }

        var seen = Set<Int32>(), roots = Set<Int32>(), items: [Item] = [], behind: [Left] = []
        for pid in pids where pid > 1 {
            // Only yours, hanging off launchd, without a terminal.
            guard let p = infos[pid], p.ppid == 1, p.tty == nil else { continue }
            let sid = getsid(pid)
            let pgid = getpgid(pid)
            // If its session leader or process group leader is still alive, its terminal / screen session hasn't closed.
            if sid > 1, sid != pid, alive.contains(sid) { continue }
            if pgid > 1, pgid != pid, alive.contains(pgid), infos[pgid]?.tty != nil { continue }
            guard let path = Proc.path(pid), !Self.isExcluded(path: path, name: Proc.name(pid)),
                  !Proc.isClaude(pid), Proc.otherAI(pid) == nil,
                  Detached.sessionName(hosting: pid, anyBuild: true) == nil else { continue }

            // Measure the whole process tree under this orphan root (e.g. `npm run dev` waiting on a frozen `node` child).
            var tree = [pid], level = [pid]
            for _ in 0..<6 where !level.isEmpty {
                level = level.flatMap { children[$0] ?? [] }.filter { c in
                    guard let cp = Proc.path(c) else { return true }
                    return !Self.isExcluded(path: cp, name: Proc.name(c))
                }
                tree += level
            }
            var treeCpu = 0.0, treeCpuTime = 0.0, hadPrev = false
            for q in tree {
                guard let qi = infos[q] else { continue }
                seen.insert(q)
                treeCpuTime += Double(qi.cpuTime) / 1e9
                if let prev = last[q], prev.started == qi.started, now > prev.at, qi.cpuTime >= prev.cpu {
                    treeCpu += Double(qi.cpuTime - prev.cpu) / 1e9 / (now - prev.at) * 100
                    hadPrev = true
                }
                last[q] = (qi.started, qi.cpuTime, now)
            }
            roots.insert(pid)
            let startedMs = Double(p.started / 1000)
            let procCwd = Proc.cwd(pid)
            let matchingSessions = procCwd.map { cwd in
                sessions.filter { startedMs >= $0.started - 5_000 && Self.inFolder(cwd, of: $0.cwd) }
            } ?? []
            // A job started by a live AI session that is currently working is doing the user's work, not a runaway.
            if matchingSessions.contains(where: \.busy) {
                over[pid] = nil
                continue
            }
            if runaway(pid, p, path: path, cpu: treeCpu, cpuTime: treeCpuTime, valid: hadPrev, wall: wall, into: &items) { continue }
            // While the AI session that started this process in its folder is still open, it isn't a closed terminal's leftover.
            guard matchingSessions.isEmpty, sid > 1, sid != pid, !alive.contains(sid) else { continue }
            behind.append(Left(pid: pid, started: startedMs, args: Proc.arguments(pid) ?? [path], cwd: procCwd ?? HOME))
        }
        left = behind.sorted { $0.started < $1.started }
        last = last.filter { seen.contains($0.key) }
        over = over.filter { roots.contains($0.key) }
        items.sort { $0.cpu > $1.cpu }
        let next = (try? JSONEncoder().encode(items)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        if next != json {
            json = next
            onChange?(next)
        }
    }

    /// Whether it (or its process tree) has burned half a core or more for two minutes (then it's added to `items`).
    private func runaway(_ pid: Int32, _ p: Proc.Info, path: String, cpu: Double, cpuTime: Double, valid: Bool, wall: Double,
                         into items: inout [Item]) -> Bool {
        guard valid else { return false }
        guard cpu >= Self.line else {
            over[pid] = nil
            return false
        }
        let since = over[pid] ?? wall
        over[pid] = since
        guard wall - since >= Self.sustain * 1000 else { return false }
        let name = Proc.name(pid) ?? (path as NSString).lastPathComponent
        let cmd = Proc.arguments(pid)?.joined(separator: " ") ?? path
        items.append(Item(pid: pid, name: name, cmd: String(cmd.prefix(300)), cpu: (cpu * 10).rounded() / 10, since: since,
                          started: Double(p.started / 1000), cpuTime: cpuTime))
        return true
    }

    /// A car left behind, ended on the orbit: it and everything it started (npm's child server too), deepest first. TERM,
    /// then KILL two seconds later for what's still there. Only the process the page showed: same pid, same start, yours.
    func endLeft(pid: Int32, started: Double) {
        guard pid > 1, let p = Proc.info(pid), p.uid == getuid(), abs(Double(p.started / 1000) - started) < 1 else { return }
        var tree: [(pid: Int32, started: UInt64)] = []
        func walk(_ pid: Int32) {
            for child in Proc.children(of: pid) { walk(child) }
            if let i = Proc.info(pid) { tree.append((pid, i.started)) }
        }
        walk(pid)
        for t in tree { kill(t.pid, SIGTERM) }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            for t in tree where Proc.info(t.pid)?.started == t.started { kill(t.pid, SIGKILL) }
            self?.sample()
        }
    }

    /// The dashboard's End button: ends the runaway process and its children, deepest first (TERM, then KILL two seconds
    /// later if still there). Only the process the page showed: same pid, same start, yours.
    func end(pid: Int32, started: Double) {
        endLeft(pid: pid, started: started)
    }
}
