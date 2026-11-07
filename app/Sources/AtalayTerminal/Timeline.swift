import Foundation

/// The time machine's record (the map's ⟲ button, app.js): a line per change of a session's status, and one per
/// launch, kept for the last 24 hours in the app's own folder. Written as the state comes (MainWindowController.apply,
/// main thread), read only when the page asks; nothing is read at launch.
enum Timeline {
    private static let url = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal/timeline.jsonl")
    private static let queue = DispatchQueue(label: "atalay.timeline", qos: .utility)
    private static let keep = 24 * 3_600_000.0
    /// Main thread: each session's status as last written, and whether this launch's line is.
    private static var last: [String: String] = [:]
    private static var booted = false
    /// The queue's: when the file was last cut back to 24 hours.
    private static var trimmed = 0.0

    static func record(_ list: [SessionBrief]) {
        let now = (Date().timeIntervalSince1970 * 1000).rounded()
        var out: [[String: Any]] = []
        if !booted {
            booted = true
            // The sessions a launch doesn't list again ended while the app was closed (the page's tmAt).
            out.append(["t": now, "k": "boot"])
        }
        for b in list where last[b.id] != b.status {
            last[b.id] = b.status
            var line: [String: Any] = ["t": now, "s": b.id, "st": b.status, "n": b.name, "c": tildify(b.cwd)]
            if let w = b.waitingFor { line["w"] = w }
            out.append(line)
        }
        // Gone from the list without ending (dismissed): ended all the same.
        let ids = Set(list.map(\.id))
        for (sid, st) in last where !ids.contains(sid) {
            last[sid] = nil
            if st != "ended" { out.append(["t": now, "s": sid, "st": "ended"]) }
        }
        guard !out.isEmpty else { return }
        var data = Data()
        for line in out {
            if let d = try? JSONSerialization.data(withJSONObject: line, options: .withoutEscapingSlashes) { data += d + [10] }
        }
        queue.async {
            if now - trimmed > 3_600_000 {
                trimmed = now
                let (kept, total) = lines(since: now - keep)
                if kept.count < total { try? kept.map { $0 + "\n" }.joined().write(to: url, atomically: true, encoding: .utf8) }
            }
            append(data)
        }
    }

    /// The last 24 hours' lines as a JSON array, handed over on the main thread.
    static func read(_ done: @escaping (String) -> Void) {
        queue.async {
            let json = "[" + lines(since: Date().timeIntervalSince1970 * 1000 - keep).kept.joined(separator: ",") + "]"
            DispatchQueue.main.async { done(json) }
        }
    }

    private static func lines(since: Double) -> (kept: [String], total: Int) {
        guard let text = try? String(contentsOf: url, encoding: .utf8) else { return ([], 0) }
        let all = text.split(separator: "\n").map(String.init)
        let kept = all.filter { line in
            guard let j = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any], let t = j["t"] as? Double else { return false }
            return t >= since
        }
        return (kept, all.count)
    }

    private static func append(_ data: Data) {
        let fm = FileManager.default
        if !fm.fileExists(atPath: url.path) {
            try? fm.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            fm.createFile(atPath: url.path, contents: nil)
        }
        guard let h = try? FileHandle(forWritingTo: url) else { return }
        defer { try? h.close() }
        _ = try? h.seekToEnd()
        try? h.write(contentsOf: data)
    }
}
