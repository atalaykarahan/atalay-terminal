import Foundation

/// Claude's usage limits, the 5-hour and the weekly window, as Claude Code's status line reports them: the account's,
/// so they count what was used anywhere (claude.ai, the phone), as of Claude Code's last request on this Mac.
/// Claude Code's settings (statusLine) run `statusline.sh` on every status update; the script keeps the latest status
/// JSON that carries `rate_limits`, so nothing here needs Claude's credentials.
enum Limits {
    private static let dir = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    static let path = dir.appendingPathComponent("limits.json").path
    private static let scriptURL = dir.appendingPathComponent("statusline.sh")
    /// The status line the user had before ours (its command): ours hands Claude's JSON on to it and shows what it prints.
    private static let nextURL = dir.appendingPathComponent("statusline-next")

    private static let script = """
    #!/bin/sh
    # Atalay's Terminal: Claude Code passes its status JSON here (statusLine in its settings.json). The latest one that
    # carries the account's usage limits is kept for the dashboard. A status line of your own (statusline-next) still
    # gets the JSON and shows what it prints.
    dir="$HOME/Library/Application Support/atalay-terminal"
    json=$(cat)
    case "$json" in
    *'"rate_limits"'*)
      mkdir -p "$dir" 2>/dev/null
      tmp="$dir/limits.$$.json"
      printf '%s' "$json" > "$tmp" && mv -f "$tmp" "$dir/limits.json"
      ;;
    esac
    if [ -s "$dir/statusline-next" ]; then printf '%s' "$json" | /bin/sh -c "$(cat "$dir/statusline-next")"; fi
    exit 0

    """

    /// Writes the script the status line command runs, so it is there even if the folder was cleared, and hooks it into
    /// Claude Code's settings.
    static func installScript() {
        if (try? String(contentsOf: scriptURL, encoding: .utf8)) != script {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try? script.write(to: scriptURL, atomically: true, encoding: .utf8)
            try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: scriptURL.path)
        }
        hookStatusLine()
    }

    /// Points Claude Code's statusLine at the script, or the limits never reach the dashboard. A status line the user
    /// already had keeps working through it (its command moves to statusline-next); a settings file that doesn't read
    /// as JSON is left alone.
    private static func hookStatusLine() {
        let file = CLAUDE_DIR + "/settings.json"
        let ours = "/bin/sh '\(scriptURL.path)'"
        var settings: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: file) {
            guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            settings = json
        }
        var line = settings["statusLine"] as? [String: Any] ?? [:]
        let current = line["command"] as? String
        guard current != ours else { return }
        if let current, !current.isEmpty {
            try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            try? current.write(to: nextURL, atomically: true, encoding: .utf8)
        }
        line["type"] = "command"
        line["command"] = ours
        settings["statusLine"] = line
        guard let out = try? JSONSerialization.data(withJSONObject: settings, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        else { return }
        try? FileManager.default.createDirectory(atPath: CLAUDE_DIR, withIntermediateDirectories: true)
        try? out.write(to: URL(fileURLWithPath: file), options: .atomic)
    }

    /// `{fiveHour: {pct, resetsAt}, week: {pct, resetsAt}, at}` with times in ms, or nil if nothing was reported yet.
    static func parse(mtime: Double) -> [String: Any]? {
        guard let data = FileManager.default.contents(atPath: path),
              let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let rl = j["rate_limits"] as? [String: Any] else { return nil }
        func window(_ key: String) -> Any {
            guard let w = rl[key] as? [String: Any], let pct = (w["used_percentage"] as? NSNumber)?.doubleValue else { return NSNull() }
            let reset = (w["resets_at"] as? NSNumber)?.doubleValue ?? 0
            return ["pct": pct, "resetsAt": reset < 1e12 ? reset * 1000 : reset]
        }
        return ["fiveHour": window("five_hour"), "week": window("seven_day"), "at": mtime]
    }

    /// The last limits another tool reported (Codex's, Antigravity's), kept so they still show while it isn't running and
    /// after a restart.
    static func save(_ value: [String: Any], as tool: String) {
        guard let data = try? JSONSerialization.data(withJSONObject: value) else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? data.write(to: dir.appendingPathComponent("limits-\(tool).json"), options: .atomic)
    }

    static func load(_ tool: String) -> [String: Any]? {
        guard let data = FileManager.default.contents(atPath: dir.appendingPathComponent("limits-\(tool).json").path) else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }
}
