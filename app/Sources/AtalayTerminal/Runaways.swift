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
        let demo: Bool
    }

    /// The staging build sounds the alarm a few seconds after it opens: it starts a demo runaway (a zsh that spins for
    /// three minutes and then ends by itself) and needs only a few seconds of it.
    static let staging = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true
    private static let line = 50.0
    private static let sustain: Double = staging ? 3 : 120
    private static let every: TimeInterval = staging ? 1.5 : 5

    var onChange: ((String) -> Void)?
    private(set) var json = "[]"
    private var last: [Int32: (started: UInt64, cpu: UInt64, at: Double)] = [:]
    private var over: [Int32: Double] = [:]
    private var demoPid: Int32 = 0
    private var timer: Timer?

    func start() {
        timer = Timer.scheduledTimer(withTimeInterval: Self.every, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated { self?.sample() }
        }
        if Self.staging { DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self] in self?.startDemo() } }
    }

    private func sample() {
        let me = getuid(), now = ProcessInfo.processInfo.systemUptime, wall = Date().timeIntervalSince1970 * 1000
        var seen = Set<Int32>(), items: [Item] = []
        for pid in Proc.all() where pid > 1 {
            // Only yours, hanging off launchd, without a terminal.
            guard let p = Proc.info(pid), p.uid == me, p.ppid == 1, p.tty == nil else { continue }
            seen.insert(pid)
            let prev = last[pid]
            last[pid] = (p.started, p.cpuTime, now)
            guard let prev, prev.started == p.started, now > prev.at, p.cpuTime >= prev.cpu else { continue }
            let cpu = Double(p.cpuTime - prev.cpu) / 1e9 / (now - prev.at) * 100
            guard cpu >= Self.line else {
                over[pid] = nil
                continue
            }
            let since = over[pid] ?? wall
            over[pid] = since
            // Apps (and their helpers) are Activity Monitor's business.
            guard wall - since >= Self.sustain * 1000, let path = Proc.path(pid), !path.contains(".app/") else { continue }
            let name = Proc.name(pid) ?? (path as NSString).lastPathComponent
            let cmd = Proc.arguments(pid)?.joined(separator: " ") ?? path
            items.append(Item(pid: pid, name: name, cmd: String(cmd.prefix(300)), cpu: (cpu * 10).rounded() / 10, since: since,
                              started: Double(p.started / 1000), cpuTime: Double(p.cpuTime) / 1e9, demo: pid == demoPid))
        }
        last = last.filter { seen.contains($0.key) }
        over = over.filter { seen.contains($0.key) }
        items.sort { $0.cpu > $1.cpu }
        let next = (try? JSONEncoder().encode(items)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
        if next != json {
            json = next
            onChange?(next)
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

    /// Staging: a zsh that spins for three minutes and ends by itself, left without a parent or a terminal, as a
    /// runaway is (its sh exits at once). One at a time: a launch while the last one's demo still spins takes that one.
    private static let demoMark = "atalay-terminal staging demo"
    private func startDemo() {
        if let running = Proc.all().first(where: { Proc.arguments($0)?.joined(separator: " ").contains(Self.demoMark) == true }) {
            demoPid = running
            return
        }
        let p = Process(), out = Pipe()
        p.executableURL = URL(fileURLWithPath: "/bin/sh")
        p.arguments = ["-c", "/bin/zsh -fc 'end=$((SECONDS + 180)); while (( SECONDS < end )); do :; done; : \(Self.demoMark)' </dev/null >/dev/null 2>&1 & echo $!"]
        p.standardOutput = out
        guard (try? p.run()) != nil else { return }
        p.waitUntilExit()
        let pid = String(decoding: out.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
        demoPid = Int32(pid) ?? 0
    }
}
