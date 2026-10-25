import AppKit

/// Watches the main thread from a background queue while the app is in front. When it stops answering for
/// a few seconds (a hang), it saves a stack sample of the whole app to ~/Library/Logs/Atalay's Terminal/,
/// one report per hang, so the cause can be seen instead of guessed.
///
/// It only runs while the app is active: in the background App Nap legitimately delays the main queue,
/// which would look like a hang, and nobody is waiting on the UI then.
final class HangWatchdog: @unchecked Sendable {
    static let shared = HangWatchdog()

    private let queue = DispatchQueue(label: "atalay.watchdog", qos: .utility)
    private let lock = NSLock()
    private var timer: DispatchSourceTimer?
    private var running = false
    private var lastBeat = ProcessInfo.processInfo.systemUptime
    private var reported = false
    /// systemUptime stops while the Mac sleeps, so sleep never counts as a hang.
    private let threshold = 5.0

    @MainActor
    func start() {
        let t = DispatchSource.makeTimerSource(queue: queue)
        t.schedule(deadline: .now() + 1, repeating: 1, leeway: .milliseconds(250))
        t.setEventHandler { [weak self] in self?.check() }
        timer = t
        let nc = NotificationCenter.default
        nc.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.setRunning(true) }
        nc.addObserver(forName: NSApplication.didResignActiveNotification, object: nil, queue: .main) { [weak self] _ in self?.setRunning(false) }
        setRunning(NSApp.isActive)
    }

    private func setRunning(_ on: Bool) {
        lock.lock()
        defer { lock.unlock() }
        guard on != running, let timer else { return }
        running = on
        lastBeat = ProcessInfo.processInfo.systemUptime
        reported = false
        if on { timer.resume() } else { timer.suspend() }
    }

    private func check() {
        DispatchQueue.main.async { [weak self] in self?.beat() }
        lock.lock()
        let silent = ProcessInfo.processInfo.systemUptime - lastBeat
        let report = running && silent > threshold && !reported
        if report { reported = true }
        lock.unlock()
        if report { record(silent) }
    }

    private func beat() {
        lock.lock()
        lastBeat = ProcessInfo.processInfo.systemUptime
        reported = false
        lock.unlock()
    }

    private func record(_ silent: Double) {
        let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Logs/Atalay's Terminal")
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
        let file = dir.appendingPathComponent("hang-\(stamp).txt")
        NSLog("Atalay's Terminal: main thread unresponsive for %.1fs, sampling to %@", silent, file.path)
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/sample")
        p.arguments = [String(getpid()), "3", "-file", file.path]
        p.standardOutput = FileHandle.nullDevice
        p.standardError = FileHandle.nullDevice
        // The sampler must not inherit a throttled priority, and must not linger if it gets stuck.
        p.qualityOfService = .userInitiated
        guard (try? p.run()) != nil else { return }
        queue.asyncAfter(deadline: .now() + 15) { if p.isRunning { p.terminate() } }
        // Keep the ten newest reports.
        let fm = FileManager.default
        let reports = ((try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? [])
            .filter { $0.lastPathComponent.hasPrefix("hang-") }
            .sorted { $0.lastPathComponent > $1.lastPathComponent }
        for old in reports.dropFirst(10) { try? fm.removeItem(at: old) }
    }
}
