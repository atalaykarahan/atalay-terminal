import Foundation

/// Asynchronous, append-only state logger for Orbit Time-Machine telemetry (`~/.claude/orbit-telemetry.jsonl`).
/// Buffers session state transitions in memory on a background utility queue and flushes in batches every 5 seconds.
final class OrbitTelemetry {
    struct Entry: Equatable {
        let t: Int
        let sid: String
        let status: String
        let cpu: Int
        let files: [String]

        func jsonLine() -> String? {
            let dict: [String: Any] = [
                "t": t,
                "sid": sid,
                "status": status,
                "cpu": cpu,
                "files": files,
            ]
            guard JSONSerialization.isValidJSONObject(dict),
                  let data = try? JSONSerialization.data(withJSONObject: dict, options: [.sortedKeys]) else { return nil }
            return String(decoding: data, as: UTF8.self)
        }
    }

    private struct SessionSignature: Equatable {
        let status: String
        let cpu: Int
        let files: [String]
    }

    let filePath: String
    let flushInterval: TimeInterval
    let maxBufferSize: Int
    private let queue = DispatchQueue(label: "atalay.orbit.telemetry", qos: .utility)
    private var buffer: [String] = []
    private var lastBySid: [String: SessionSignature] = [:]
    private var timer: DispatchSourceTimer?
    private var stopped = false

    init(claudeDir: String = CLAUDE_DIR, filePath: String? = nil, flushInterval: TimeInterval = 5.0, maxBufferSize: Int = 2000) {
        self.filePath = filePath ?? (claudeDir as NSString).appendingPathComponent("orbit-telemetry.jsonl")
        self.flushInterval = flushInterval
        self.maxBufferSize = maxBufferSize
        startTimer()
    }

    deinit {
        timer?.cancel()
    }

    private func startTimer() {
        guard flushInterval > 0 else { return }
        let t = DispatchSource.makeTimerSource(queue: queue)
        let leeway = DispatchTimeInterval.milliseconds(Int(max(50, flushInterval * 100)))
        t.schedule(deadline: .now() + flushInterval, repeating: flushInterval, leeway: leeway)
        t.setEventHandler { [weak self] in
            self?.flushLocked()
        }
        t.resume()
        timer = t
    }

    /// Records a single session telemetry point asynchronously.
    func record(sid: String, status: String, cpu: Double, files: [String], timestamp: Int = Int(Date().timeIntervalSince1970)) {
        guard !sid.isEmpty else { return }
        let roundedCpu = Int(cpu.rounded())
        let cleanFiles = Array(Set(files.map { ($0 as NSString).lastPathComponent }.filter { !$0.isEmpty })).sorted()
        queue.async {
            guard !self.stopped else { return }
            if status == "ended" {
                if self.lastBySid.removeValue(forKey: sid) != nil {
                    self.enqueueEntryLocked(sid: sid, status: "ended", cpu: 0, files: [], timestamp: timestamp)
                }
                return
            }
            self.appendLocked(sid: sid, status: status, cpu: roundedCpu, files: cleanFiles, timestamp: timestamp)
        }
    }

    /// Extracts session snapshots from a `RadarEngine` state dictionary and buffers changed session states.
    /// Automatically prunes closed/disappeared sessions from `lastBySid` to prevent memory leaks.
    func record(snapshot: [String: Any], timestamp: Int = Int(Date().timeIntervalSince1970)) {
        guard let sessions = snapshot["sessions"] as? [[String: Any]] else { return }
        let rawFiles = snapshot["files"] as? [[String: Any]] ?? []
        var filesBySid: [String: [String]] = [:]
        for f in rawFiles {
            guard let path = (f["p"] as? String) ?? (f["short"] as? String), !path.isEmpty else { continue }
            let base = (path as NSString).lastPathComponent
            guard !base.isEmpty, let editors = f["editors"] as? [[String: Any]] else { continue }
            for e in editors {
                if let sid = e["s"] as? String, !sid.isEmpty {
                    filesBySid[sid, default: []].append(base)
                }
            }
        }
        var extracted: [(sid: String, status: String, cpu: Int, files: [String], live: Bool)] = []
        extracted.reserveCapacity(sessions.count)
        for s in sessions {
            guard let sid = s["id"] as? String, !sid.isEmpty else { continue }
            let status = (s["status"] as? String) ?? "ended"
            let cpuVal = (s["cpu"] as? Double) ?? Double((s["cpu"] as? Int) ?? 0)
            let cpu = Int(cpuVal.rounded())
            let live = (s["live"] as? Bool) ?? (status != "ended")
            let sFiles = Array(Set(filesBySid[sid] ?? [])).sorted()
            extracted.append((sid, status, cpu, sFiles, live))
        }
        queue.async {
            guard !self.stopped else { return }
            var activeIds = Set<String>()
            for item in extracted {
                if !item.live || item.status == "ended" {
                    if self.lastBySid.removeValue(forKey: item.sid) != nil {
                        self.enqueueEntryLocked(sid: item.sid, status: "ended", cpu: 0, files: [], timestamp: timestamp)
                    }
                    continue
                }
                activeIds.insert(item.sid)
                self.appendLocked(sid: item.sid, status: item.status, cpu: item.cpu, files: item.files, timestamp: timestamp)
            }
            for sid in Array(self.lastBySid.keys) where !activeIds.contains(sid) {
                self.lastBySid.removeValue(forKey: sid)
            }
        }
    }

    /// Evicts a closed or dismissed session from in-memory state tracking.
    func evict(sessionId: String) {
        queue.async {
            self.lastBySid.removeValue(forKey: sessionId)
        }
    }

    /// Flushes buffered telemetry lines to disk asynchronously.
    func flush(completion: (() -> Void)? = nil) {
        queue.async {
            self.flushLocked()
            completion?()
        }
    }

    /// Synchronously flushes buffered lines (for tests or app termination).
    func flushSync() {
        queue.sync {
            self.flushLocked()
        }
    }

    /// Stops the periodic timer, flushes remaining lines, and clears in-memory state.
    func stop() {
        queue.sync {
            self.stopped = true
            self.timer?.cancel()
            self.timer = nil
            self.flushLocked()
            self.buffer.removeAll()
            self.lastBySid.removeAll()
        }
    }

    /// Current number of tracked sessions and buffered lines (for unit testing).
    func stats() -> (trackedSessions: Int, bufferedLines: Int) {
        queue.sync { (lastBySid.count, buffer.count) }
    }

    /// Reads the last `maxAgeSeconds` (default 24h) of telemetry entries asynchronously on the background queue,
    /// sorted ascending by timestamp `t`, and delivers the JSON array string on the main queue.
    func readHistory(maxAgeSeconds: Int = 86_400, completion: @escaping @MainActor (String) -> Void) {
        queue.async {
            self.flushLocked()
            let items = self.readHistoryLocked(maxAgeSeconds: maxAgeSeconds)
            let data = (try? JSONSerialization.data(withJSONObject: items)) ?? Data("[]".utf8)
            let json = String(decoding: data, as: UTF8.self)
            DispatchQueue.main.async {
                completion(json)
            }
        }
    }

    /// Synchronously reads and parses the last `maxAgeSeconds` of telemetry entries (for unit tests).
    func readHistorySync(maxAgeSeconds: Int = 86_400) -> [[String: Any]] {
        queue.sync {
            self.flushLocked()
            return self.readHistoryLocked(maxAgeSeconds: maxAgeSeconds)
        }
    }

    private func readHistoryLocked(maxAgeSeconds: Int) -> [[String: Any]] {
        let fm = FileManager.default
        guard fm.fileExists(atPath: filePath),
              let fh = FileHandle(forReadingAtPath: filePath) else { return [] }
        defer { try? fh.close() }
        let maxBytes: UInt64 = 4 * 1024 * 1024
        let size = (try? fh.seekToEnd()) ?? 0
        let offset = size > maxBytes ? size - maxBytes : 0
        try? fh.seek(toOffset: offset)
        guard let data = try? fh.readToEnd(), !data.isEmpty else { return [] }
        var text = String(decoding: data, as: UTF8.self)
        if offset > 0, let nl = text.firstIndex(of: "\n") {
            text = String(text[text.index(after: nl)...])
        }
        let cutoff = Int(Date().timeIntervalSince1970) - maxAgeSeconds
        var out: [[String: Any]] = []
        for line in text.split(separator: "\n") {
            guard let lineData = line.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any],
                  let t = obj["t"] as? Int,
                  t >= cutoff else { continue }
            out.append(obj)
        }
        out.sort { (($0["t"] as? Int) ?? 0) < (($1["t"] as? Int) ?? 0) }
        return out
    }

    private func appendLocked(sid: String, status: String, cpu: Int, files: [String], timestamp: Int) {
        let sig = SessionSignature(status: status, cpu: cpu, files: files)
        if lastBySid[sid] == sig { return }
        lastBySid[sid] = sig
        enqueueEntryLocked(sid: sid, status: status, cpu: cpu, files: files, timestamp: timestamp)
    }

    private func enqueueEntryLocked(sid: String, status: String, cpu: Int, files: [String], timestamp: Int) {
        let entry = Entry(t: timestamp, sid: sid, status: status, cpu: cpu, files: files)
        guard let line = entry.jsonLine() else { return }
        buffer.append(line)
        if buffer.count > maxBufferSize {
            buffer.removeFirst(buffer.count - maxBufferSize)
        }
    }

    private func flushLocked() {
        guard !buffer.isEmpty else { return }
        let batch = buffer
        buffer.removeAll(keepingCapacity: false)
        let payload = batch.joined(separator: "\n") + "\n"
        guard let data = payload.data(using: .utf8) else { return }
        let fm = FileManager.default
        let dir = (filePath as NSString).deletingLastPathComponent
        if !fm.fileExists(atPath: dir) {
            try? fm.createDirectory(atPath: dir, withIntermediateDirectories: true)
        }
        if !fm.fileExists(atPath: filePath) {
            fm.createFile(atPath: filePath, contents: data)
            return
        }
        guard let fh = FileHandle(forWritingAtPath: filePath) else { return }
        defer { try? fh.close() }
        do {
            try fh.seekToEnd()
            try fh.write(contentsOf: data)
        } catch {}
    }
}
