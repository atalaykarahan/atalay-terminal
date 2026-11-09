import Foundation

/// Antigravity's usage limits, as its CLI reports them (`agy -p /usage --output-format json`: no agent turn, and with
/// --log-file /dev/null no log file left behind). Its models come in groups (Gemini, Claude and GPT, Gemini 4 Argon…), each
/// with its own 5-hour and weekly window.
enum AgyUsage {
    /// `{groups: [{name, models, fiveHour: {pct, resetsAt}, week: {pct, resetsAt}}], at}`, pct used, times in ms; nil when
    /// the CLI isn't installed or doesn't answer.
    static func read() -> [String: Any]? {
        guard let executable = agyExecutable() else { return nil }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = ["-p", "/usage", "--output-format", "json", "--log-file", "/dev/null"]
        process.standardInput = FileHandle.nullDevice
        let output = Pipe()
        process.standardOutput = output
        process.standardError = FileHandle.nullDevice
        do { try process.run() } catch { return nil }
        let timeout = DispatchWorkItem { if process.isRunning { process.terminate() } }
        DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 20, execute: timeout)
        let data = output.fileHandleForReading.readDataToEndOfFile()
        process.waitUntilExit()
        timeout.cancel()
        guard let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let command = j["command"] as? [String: Any], let d = command["data"] as? [String: Any],
              let groups = d["groups"] as? [[String: Any]] else { return nil }
        var list: [[String: Any]] = []
        for g in groups {
            // "Models within this group: Gemini Flash, Gemini Pro"
            let about = g["description"] as? String ?? ""
            let models = about.hasPrefix("Models within this group:") ? String(about.dropFirst("Models within this group:".count)) : ""
            var item: [String: Any] = ["name": g["name"] as? String ?? "", "models": models.trimmingCharacters(in: .whitespaces)]
            for b in g["buckets"] as? [[String: Any]] ?? [] {
                guard let left = (b["remaining_fraction"] as? NSNumber)?.doubleValue else { continue }
                let key = switch b["window"] as? String { case "5h": "fiveHour"; case "weekly": "week"; default: "" }
                guard !key.isEmpty else { continue }
                item[key] = ["pct": max(0, min(100, (1 - left) * 100)), "resetsAt": parseISO(b["reset_time"] as? String)]
            }
            list.append(item)
        }
        return list.isEmpty ? nil : ["groups": list, "at": Date().timeIntervalSince1970 * 1000]
    }

    /// The groups the top bar shows, a column each in the CLI's order: the one the model in use draws on (the group listing
    /// it: "Gemini 4 Argon", "Claude Opus"), and any other under half; one nobody uses, at 100%, would only take room.
    /// With no model known (or one no group lists), every group used at all. Each has only the windows it has: Argon's is
    /// weekly only (Google: "a separate weekly-only Argon quota for Pro"), and Argon's work doesn't move Gemini's 5 hours.
    /// `{id, name, group, windows, fiveHour?, week?, at}`, the shape of the other tools' limits.
    static func pools(_ usage: [String: Any], model: String) -> [[String: Any]] {
        let groups = usage["groups"] as? [[String: Any]] ?? []
        let id = model.lowercased()
        // A name lists the model when each of its words is in the model's id or name ("Gemini 4 Argon", "Claude Opus").
        func lists(_ g: [String: Any]) -> Bool {
            let names = [g["name"] as? String ?? ""] + (g["models"] as? String ?? "").split(separator: ",").map(String.init)
            return names.contains { name in
                let words = name.lowercased().split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
                return !words.isEmpty && words.allSatisfy { id.contains($0) }
            }
        }
        // What's left, while its reset hasn't passed (after it, the number says nothing until the CLI reports again).
        func left(_ w: Any?) -> Double? {
            guard let w = w as? [String: Any], let pct = (w["pct"] as? NSNumber)?.doubleValue else { return nil }
            let reset = (w["resetsAt"] as? NSNumber)?.doubleValue ?? 0
            return reset > 0 && reset <= Date().timeIntervalSince1970 * 1000 ? nil : 100 - pct
        }
        let mine = id.isEmpty ? [] : groups.filter(lists)
        var out: [[String: Any]] = []
        for g in groups {
            let windows = ["fiveHour", "week"].filter { g[$0] != nil }
            let lefts = windows.compactMap { left(g[$0]) }
            let inUse = mine.isEmpty ? lefts.contains { $0 < 100 } : mine.contains { ($0["name"] as? String) == (g["name"] as? String) }
            guard inUse || lefts.contains(where: { $0 < 50 }) else { continue }
            let name = g["name"] as? String ?? "", models = g["models"] as? String ?? ""
            // Its short name: a family's first word ("Gemini Models": gemini), a single model's last ("Gemini 4 Argon": argon).
            let words = name.lowercased().split(whereSeparator: { !$0.isLetter && !$0.isNumber }).map(String.init)
            let short = (models.isEmpty ? words.last : words.first) ?? "agy"
            var pool: [String: Any] = ["id": "agy-\(short)", "name": "agy \(short)", "group": models.isEmpty ? name : "\(name): \(models)",
                                       "windows": windows, "at": usage["at"] ?? NSNull()]
            for key in windows { pool[key] = g[key] }
            out.append(pool)
        }
        return out
    }

    private static func agyExecutable() -> String? {
        let env = ProcessInfo.processInfo.environment
        var candidates = [(HOME as NSString).appendingPathComponent(".local/bin/agy"), "/opt/homebrew/bin/agy", "/usr/local/bin/agy"]
        candidates += (env["PATH"] ?? "").split(separator: ":").map { String($0) + "/agy" }
        return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
    }
}
