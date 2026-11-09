import Foundation

/// Codex's approval prompts for the dashboard, as exact as Claude Code's own status: Codex runs our script on its hooks
/// (~/.codex/hooks.json, https://developers.openai.com/codex/hooks). A PermissionRequest (Codex is about to ask the user to
/// approve a command; it doesn't run for commands that need no approval) is kept by Codex session in `dir`; that
/// session's next tool output, stop, interrupt or prompt drops it. The script decides nothing, so Codex asks as usual.
/// Codex runs a new hook only once the user trusts it in its `/hooks`.
enum CodexHooks {
    private static let support = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    static let dir = support.appendingPathComponent("codex-waiting").path
    private static let scriptURL = support.appendingPathComponent("codex-hook.sh")
    private static let script = #"""
    #!/bin/sh
    # Atalay's Terminal: Codex runs this on its hooks (~/.codex/hooks.json), the event's JSON on stdin. A PermissionRequest
    # (Codex is about to ask you to approve a command) is kept for the dashboard; the same session's next tool output, stop,
    # interrupt or prompt drops it. It prints nothing: Codex decides nothing differently and asks as usual.
    dir="$HOME/Library/Application Support/atalay-terminal/codex-waiting"
    json=$(cat)
    sid=$(printf '%s' "$json" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[A-Za-z0-9._-]*"' | head -n 1 | sed 's/.*"\([^"]*\)"$/\1/')
    [ -n "$sid" ] || exit 0
    if [ "$1" = PermissionRequest ]; then
      mkdir -p "$dir" 2>/dev/null
      printf '%s' "$json" > "$dir/.$sid.$$" && mv -f "$dir/.$sid.$$" "$dir/$sid.json"
    else
      rm -f "$dir/$sid.json"
    fi
    exit 0
    """#
    /// The hooks it takes: PermissionRequest keeps a request (Codex waits for it, a moment), the others answer it (in the
    /// background, Codex doesn't wait for them; Interrupt's are short by Codex's rule).
    private static let events: [(name: String, background: Bool)] = [
        ("PermissionRequest", false), ("PostToolUse", true), ("Stop", true), ("Interrupt", false), ("UserPromptSubmit", true),
    ]

    /// Writes the script and adds its hooks to Codex's hooks.json, next to the user's own; once there, nothing changes (a
    /// changed hook would need trusting again). A hooks.json that doesn't read as JSON is left alone; without Codex, nothing.
    static func install() {
        let codex = HOME + "/.codex"
        guard FileManager.default.fileExists(atPath: codex) else { return }
        try? FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        if (try? String(contentsOf: scriptURL, encoding: .utf8)) != script {
            try? script.write(to: scriptURL, atomically: true, encoding: .utf8)
            try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: scriptURL.path)
        }
        let file = codex + "/hooks.json"
        var root: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: file) {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            root = json
        }
        var hooks = root["hooks"] as? [String: Any] ?? [:]
        var changed = false
        for (event, background) in events {
            let command = "/bin/sh '\(scriptURL.path)' \(event)"
            var groups = hooks[event] as? [[String: Any]] ?? []
            guard !groups.contains(where: { ($0["hooks"] as? [[String: Any]] ?? []).contains { $0["command"] as? String == command } }) else { continue }
            var handler: [String: Any] = ["type": "command", "command": command, "timeout": event == "Interrupt" ? 1 : 5]
            if background { handler["async"] = true }
            groups.append(["hooks": [handler]])
            hooks[event] = groups
            changed = true
        }
        guard changed else { return }
        root["hooks"] = hooks
        guard let out = try? JSONSerialization.data(withJSONObject: root, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) else { return }
        try? out.write(to: URL(fileURLWithPath: file), options: .atomic)
    }

    /// What waits for the user's approval now, by Codex session id: the command (or Codex's reason, or the tool) and since
    /// when (ms). One a day old was left by a Codex that quit while asking, and goes.
    static func waiting() -> [String: (command: String, since: Double)] {
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { return [:] }
        var out: [String: (command: String, since: Double)] = [:]
        for name in names where name.hasSuffix(".json") && !name.hasPrefix(".") {
            let path = dir + "/" + name
            guard let mtime = (try? FileManager.default.attributesOfItem(atPath: path))?[.modificationDate] as? Date else { continue }
            if Date().timeIntervalSince(mtime) > 86_400 {
                try? FileManager.default.removeItem(atPath: path)
                continue
            }
            var what = ""
            if let data = FileManager.default.contents(atPath: path), let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                let input = j["tool_input"] as? [String: Any] ?? [:]
                var command = input["command"] as? String ?? ""
                if command.isEmpty, let words = input["command"] as? [String] { command = words.joined(separator: " ") }
                let candidates: [String] = [command, input["description"] as? String ?? "", j["tool_name"] as? String ?? ""]
                what = candidates.first(where: { !$0.isEmpty }) ?? ""
            }
            out[String(name.dropLast(5))] = (clip(what.replacingOccurrences(of: "\n", with: " "), 120), mtime.timeIntervalSince1970 * 1000)
        }
        return out
    }

    /// A Codex session's id, from its log's name (rollout-2026-11-09T23-47-11-<session id>.jsonl).
    static func session(ofLog path: String) -> String? {
        let name = (path as NSString).lastPathComponent
        guard name.hasPrefix("rollout-"), name.hasSuffix(".jsonl"), name.count > 42 else { return nil }
        return String(name.dropLast(6).suffix(36))
    }
}
