import Foundation

/// Claude's usage limits, the 5-hour and the weekly window, as Claude Code's status line reports them.
/// ~/.claude/settings.json runs `statusline.sh` on every status update; the script keeps the latest status JSON
/// that carries `rate_limits`, so nothing here needs Claude's credentials.
enum Limits {
    private static let dir = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    static let path = dir.appendingPathComponent("limits.json").path

    private static let script = """
    #!/bin/sh
    # Atalay's Terminal: Claude Code passes its status JSON here (statusLine in ~/.claude/settings.json). The latest
    # one that carries the account's usage limits is kept for the dashboard; nothing is printed.
    dir="$HOME/Library/Application Support/atalay-terminal"
    json=$(cat)
    case "$json" in
    *'"rate_limits"'*)
      mkdir -p "$dir" 2>/dev/null
      tmp="$dir/limits.$$.json"
      printf '%s' "$json" > "$tmp" && mv -f "$tmp" "$dir/limits.json"
      ;;
    esac
    exit 0

    """

    /// Writes the script the status line command runs, so it is there even if the folder was cleared.
    static func installScript() {
        let url = dir.appendingPathComponent("statusline.sh")
        guard (try? String(contentsOf: url, encoding: .utf8)) != script else { return }
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? script.write(to: url, atomically: true, encoding: .utf8)
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: url.path)
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
}
