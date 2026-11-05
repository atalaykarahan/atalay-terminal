import Foundation

/// Reads the authenticated account's current Codex limits from Codex app-server.
/// Rollout files remain useful for per-chat tokens, but they are not the source of truth for account limits.
enum CodexUsage {
    static func read() -> [String: Any]? {
        guard let executable = codexExecutable() else { return nil }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        // No --stdio: stdio is the default, and older Codex (0.104) refuses the flag and exits.
        process.arguments = ["app-server"]
        process.standardInput = Pipe()
        process.standardOutput = Pipe()
        process.standardError = FileHandle.nullDevice
        do { try process.run() } catch { return nil }
        let timeout = DispatchWorkItem { if process.isRunning { process.terminate() } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 20, execute: timeout)
        defer { timeout.cancel() }
        guard let input = process.standardInput as? Pipe,
              let output = process.standardOutput as? Pipe else {
            process.terminate()
            return nil
        }
        // A codex that exits early (an old one without app-server) would make the next write raise SIGPIPE, which
        // ends the whole app; the write fails instead.
        _ = fcntl(input.fileHandleForWriting.fileDescriptor, F_SETNOSIGPIPE, 1)

        defer {
            try? input.fileHandleForWriting.close()
            if process.isRunning { process.terminate() }
        }

        func send(_ value: [String: Any]) -> Bool {
            guard let data = try? JSONSerialization.data(withJSONObject: value),
                  var line = String(data: data, encoding: .utf8) else { return false }
            line.append("\n")
            guard let bytes = line.data(using: .utf8) else { return false }
            do { try input.fileHandleForWriting.write(contentsOf: bytes); return true }
            catch { return false }
        }

        func response(id: Int) -> [String: Any]? {
            let handle = output.fileHandleForReading
            var line = Data()
            while process.isRunning {
                guard let byte = try? handle.read(upToCount: 1), !byte.isEmpty else { break }
                if byte[0] == 0x0A {
                    guard let message = try? JSONSerialization.jsonObject(with: line) as? [String: Any] else {
                        line.removeAll(keepingCapacity: true)
                        continue
                    }
                    if (message["id"] as? Int) == id { return message }
                    line.removeAll(keepingCapacity: true)
                } else {
                    line.append(byte[0])
                }
            }
            return nil
        }

        guard send(["method": "initialize", "id": 1,
                    "params": ["clientInfo": ["name": "atalay-terminal", "version": "0.17.0"]]]),
              let initialized = response(id: 1), initialized["error"] == nil,
              send(["method": "initialized", "params": [:]]),
              send(["method": "account/rateLimits/read", "id": 2]),
              let reply = response(id: 2), reply["error"] == nil,
              let result = reply["result"] as? [String: Any] else { return nil }

        // Current app-server calls it rateLimits; accept the snake_case spelling from older builds too.
        guard let snapshot = (result["rateLimits"] ?? result["rate_limits"]) as? [String: Any] else { return nil }
        func window(_ camel: String, _ snake: String) -> Any {
            guard let value = (snapshot[camel] ?? snapshot[snake]) as? [String: Any],
                  let pct = (value["usedPercent"] ?? value["used_percent"] ?? value["used_percentage"]) as? NSNumber else {
                return NSNull()
            }
            let reset = (value["resetsAt"] ?? value["resets_at"]) as? NSNumber
            let duration = (value["windowDurationMins"] ?? value["window_duration_mins"] ?? value["window_minutes"]) as? NSNumber
            let resetSeconds = reset?.doubleValue ?? 0
            return ["pct": pct.doubleValue,
                    "resetsAt": resetSeconds > 0 && resetSeconds < 1e12 ? resetSeconds * 1000 : resetSeconds,
                    "windowMinutes": duration ?? 0]
        }
        let primary = window("primary", "primary")
        let secondary = window("secondary", "secondary")
        guard !(primary is NSNull) || !(secondary is NSNull) else { return nil }
        return ["fiveHour": primary, "week": secondary, "at": Date().timeIntervalSince1970 * 1000,
                "plan": (snapshot["planType"] ?? snapshot["plan_type"]) as? String ?? "", "source": "Codex"]
    }

    private static func codexExecutable() -> String? {
        let env = ProcessInfo.processInfo.environment
        var candidates = ["/opt/homebrew/bin/codex", "/usr/local/bin/codex",
                          (HOME as NSString).appendingPathComponent(".npm-global/bin/codex"),
                          (HOME as NSString).appendingPathComponent(".local/bin/codex")]
        candidates += (env["PATH"] ?? "").split(separator: ":").map { String($0) + "/codex" }
        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }
}
