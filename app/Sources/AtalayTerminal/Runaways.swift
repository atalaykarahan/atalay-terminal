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
    private static let sustain: Double = 120
    private static let every: TimeInterval = 5

    var onChange: ((String) -> Void)?
    private(set) var json = "[]"
    private var last: [Int32: (started: UInt64, cpu: UInt64, at: Double)] = [:]
    private var over: [Int32: Double] = [:]
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: Self.every, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.sample() }
        }
    }

    private func sample() {
        let me = getuid(), now = ProcessInfo.processInfo.systemUptime, wall = Date().timeIntervalSince1970 * 1000
        let pids = Proc.all(), alive = Set(pids)
        var seen = Set<Int32>(), items: [Item] = [], behind: [Left] = []
        for pid in pids where pid > 1 {
            // Only yours, hanging off launchd, without a terminal.
            guard let p = Proc.info(pid), p.uid == me, p.ppid == 1, p.tty == nil else { continue }
            seen.insert(pid)
            let prev = last[pid]
            last[pid] = (p.started, p.cpuTime, now)
            if runaway(pid, p, prev: prev, now: now, wall: wall, into: &items) { continue }
            // Apps (and their helpers) are Activity Monitor's business: they outlive a crash the same way.
            let sid = getsid(pid)
            guard sid > 1, sid != pid, !alive.contains(sid), let path = Proc.path(pid), !path.contains(".app/") else { continue }
            behind.append(Left(pid: pid, started: Double(p.started / 1000), args: Proc.arguments(pid) ?? [path], cwd: Proc.cwd(pid) ?? HOME))
        }
        left = behind.sorted { $0.started < $1.started }
        last = last.filter { seen.contains($0.key) }
        over = over.filter { seen.contains($0.key) }
        items.sort { $0.cpu > $1.cpu }
        let next = (try? JSONEncoder().encode(items)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        if next != json {
            json = next
            onChange?(next)
        }
    }

    /// Whether it has burned half a core or more for two minutes (then it's added to `items`).
    private func runaway(_ pid: Int32, _ p: Proc.Info, prev: (started: UInt64, cpu: UInt64, at: Double)?, now: Double, wall: Double,
                         into items: inout [Item]) -> Bool {
        guard let prev, prev.started == p.started, now > prev.at, p.cpuTime >= prev.cpu else { return false }
        let cpu = Double(p.cpuTime - prev.cpu) / 1e9 / (now - prev.at) * 100
        guard cpu >= Self.line else {
            over[pid] = nil
            return false
        }
        let since = over[pid] ?? wall
        over[pid] = since
        guard wall - since >= Self.sustain * 1000, let path = Proc.path(pid), !path.contains(".app/") else { return false }
        let name = Proc.name(pid) ?? (path as NSString).lastPathComponent
        let cmd = Proc.arguments(pid)?.joined(separator: " ") ?? path
        items.append(Item(pid: pid, name: name, cmd: String(cmd.prefix(300)), cpu: (cpu * 10).rounded() / 10, since: since,
                          started: Double(p.started / 1000), cpuTime: Double(p.cpuTime) / 1e9))
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

    /// The dashboard's End button: TERM, then KILL two seconds later if it's still there (a shell ignores TERM). Only
    /// the process the page showed: same pid, same start, yours.
    func end(pid: Int32, started: Double) {
        let same = { () -> Bool in
            guard let p = Proc.info(pid), p.uid == getuid() else { return false }
            return abs(Double(p.started / 1000) - started) < 1
        }
        guard pid > 1, same() else { return }
        kill(pid, SIGTERM)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            if same() { kill(pid, SIGKILL) }
            self?.sample()
        }
    }
}
