import Foundation

/// The AI tools draw in the app's theme (Settings · INTERFACE, on unless the user turns it off), as the terminal's own
/// text does: Claude Code, Codex and Antigravity take the themes of theirs that use the terminal's 16 colours (Claude's
/// dark-ansi or light-ansi, Codex's tui.theme "ansi", Antigravity's colorScheme "terminal"). A theme then recolours their
/// text and highlights too, at once (the colours are the terminal's, looked up as they're drawn), where their own themes
/// drew in fixed colours whatever the terminal's. Each tool's own choice is kept and goes back when this is turned off;
/// one the user changes afterwards is theirs and stays.
enum AIColors {
    static let queue = DispatchQueue(label: "ai-colors", qos: .utility)
    private static let file = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal/ai-colors.json")
    private static var claudeSettings: String { CLAUDE_DIR + "/settings.json" }
    private static var codexConfig: String { HOME + "/.codex/config.toml" }
    private static var agySettings: String { HOME + "/.gemini/antigravity-cli/settings.json" }

    private enum Tool: String, CaseIterable { case claude, codex, agy }

    private static func record() -> [String: Any] {
        FileManager.default.contents(atPath: file.path).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
    }
    private static func save(_ rec: [String: Any]) {
        guard let out = try? JSONSerialization.data(withJSONObject: rec, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) else { return }
        try? FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? out.write(to: file, options: .atomic)
    }

    /// On unless the user turned it off.
    static var isOn: Bool { queue.sync { record()["on"] as? Bool != false } }

    /// At a launch: a tool installed since gets the theme's colours too.
    static func autoStart() {
        queue.async {
            var rec = record()
            guard rec["on"] as? Bool != false else { return }
            for tool in Tool.allCases where rec[tool.rawValue] == nil {
                if let kept = apply(tool) { rec[tool.rawValue] = kept }
            }
            save(rec)
        }
    }

    /// Settings' switch.
    static func set(_ on: Bool, done: (@MainActor () -> Void)? = nil) {
        queue.async {
            var rec = record()
            rec["on"] = on
            for tool in Tool.allCases {
                if on, rec[tool.rawValue] == nil, let kept = apply(tool) { rec[tool.rawValue] = kept }
                if !on, let kept = rec[tool.rawValue] as? [String: Any] {
                    putBack(tool, kept)
                    rec[tool.rawValue] = nil
                }
            }
            save(rec)
            DispatchQueue.main.async { MainActor.assumeIsolated { done?() } }
        }
    }

    // MARK: each tool

    /// The tool on its terminal-colour theme; what it had before and what it was given, to put back. Nil: not installed,
    /// or its settings don't read.
    private static func apply(_ tool: Tool) -> [String: Any]? {
        switch tool {
        case .claude:
            // Claude's theme, light or dark as the user chose it.
            return setJSON(claudeSettings, key: "theme", requires: CLAUDE_DIR) { old in
                let was = old as? String ?? "dark"
                return was.hasSuffix("-ansi") ? nil : (was.hasPrefix("light") ? "light-ansi" : "dark-ansi")
            }
        case .agy:
            return setJSON(agySettings, key: "colorScheme", requires: (agySettings as NSString).deletingLastPathComponent) { old in
                old as? String == "terminal" ? nil : "terminal"
            }
        case .codex:
            guard FileManager.default.fileExists(atPath: HOME + "/.codex") else { return nil }
            let text = (try? String(contentsOfFile: codexConfig, encoding: .utf8)) ?? ""
            var lines = text.components(separatedBy: "\n")
            let section = lines.firstIndex { $0.trimmingCharacters(in: .whitespaces) == "[tui]" }
            var prev: String?
            if let section {
                let end = lines[(section + 1)...].firstIndex { $0.trimmingCharacters(in: .whitespaces).hasPrefix("[") } ?? lines.endIndex
                if let at = lines[(section + 1)..<end].firstIndex(where: { isThemeLine($0) }) {
                    prev = lines[at].split(separator: "=", maxSplits: 1).last.map { $0.trimmingCharacters(in: .whitespaces) }
                    if prev == "\"ansi\"" { return nil }
                    lines[at] = "theme = \"ansi\""
                } else {
                    lines.insert("theme = \"ansi\"", at: section + 1)
                }
            } else {
                if lines.last?.isEmpty == false { lines.append("") }
                lines += ["[tui]", "theme = \"ansi\"", ""]
            }
            guard (try? lines.joined(separator: "\n").write(toFile: codexConfig, atomically: true, encoding: .utf8)) != nil else { return nil }
            return ["prev": prev ?? NSNull(), "set": "\"ansi\"", "madeSection": section == nil]
        }
    }

    private static func putBack(_ tool: Tool, _ kept: [String: Any]) {
        switch tool {
        case .claude: restoreJSON(claudeSettings, key: "theme", kept)
        case .agy: restoreJSON(agySettings, key: "colorScheme", kept)
        case .codex:
            guard var text = try? String(contentsOfFile: codexConfig, encoding: .utf8) else { return }
            var lines = text.components(separatedBy: "\n")
            guard let section = lines.firstIndex(where: { $0.trimmingCharacters(in: .whitespaces) == "[tui]" }) else { return }
            let end = lines[(section + 1)...].firstIndex { $0.trimmingCharacters(in: .whitespaces).hasPrefix("[") } ?? lines.endIndex
            // Changed by the user since: theirs.
            guard let at = lines[(section + 1)..<end].firstIndex(where: { isThemeLine($0) }),
                  lines[at].split(separator: "=", maxSplits: 1).last?.trimmingCharacters(in: .whitespaces) == kept["set"] as? String
            else { return }
            if let prev = kept["prev"] as? String {
                lines[at] = "theme = " + prev
            } else {
                lines.remove(at: at)
                // A section that was the app's alone goes with it.
                if kept["madeSection"] as? Bool == true, section + 1 >= lines.count || lines[section + 1].trimmingCharacters(in: .whitespaces).isEmpty
                    || lines[section + 1].trimmingCharacters(in: .whitespaces).hasPrefix("[") {
                    lines.remove(at: section)
                }
            }
            text = lines.joined(separator: "\n")
            try? text.write(toFile: codexConfig, atomically: true, encoding: .utf8)
        }
    }

    private static func isThemeLine(_ line: String) -> Bool {
        let t = line.trimmingCharacters(in: .whitespaces)
        return t.hasPrefix("theme") && t.dropFirst(5).trimmingCharacters(in: .whitespaces).hasPrefix("=")
    }

    /// A JSON settings file's `key` set to what `value` makes of the old one (nil: leave it), when the tool is there
    /// (`requires`, its folder). A file that doesn't read as JSON is left alone.
    private static func setJSON(_ path: String, key: String, requires: String, _ value: (Any?) -> String?) -> [String: Any]? {
        guard FileManager.default.fileExists(atPath: requires) else { return nil }
        var json: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: path), !data.isEmpty {
            guard let read = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
            json = read
        }
        let old = json[key]
        guard let next = value(old) else { return nil }
        json[key] = next
        guard write(json, to: path) else { return nil }
        return ["prev": old ?? NSNull(), "set": next]
    }

    private static func restoreJSON(_ path: String, key: String, _ kept: [String: Any]) {
        guard let data = FileManager.default.contents(atPath: path),
              var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              // Changed by the user since: theirs.
              json[key] as? String == kept["set"] as? String else { return }
        json[key] = kept["prev"] is NSNull ? nil : kept["prev"]
        _ = write(json, to: path)
    }

    private static func write(_ json: [String: Any], to path: String) -> Bool {
        guard let out = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) else { return false }
        let url = URL(fileURLWithPath: path).resolvingSymlinksInPath()
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        return (try? out.write(to: url, options: .atomic)) != nil
    }
}
