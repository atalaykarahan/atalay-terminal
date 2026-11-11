import Foundation

/// The dashboard's streamer mode (the switch at its map's top right, web/app.js): the chats list and the chat windows show
/// made-up names too, from web/streamer-names.js, the same one the dashboard picks for the same real one.
enum Streamer {
    /// On while the dashboard's mode is; off whenever the app starts.
    @MainActor static var on = false

    static let names: [String: [String]] = {
        let url = RadarView.webDirectory().appendingPathComponent("streamer-names.js")
        guard let text = try? String(contentsOf: url, encoding: .utf8), let eq = text.range(of: "STREAMER_NAMES ="),
              let open = text[eq.upperBound...].firstIndex(of: "{"), let close = text.lastIndex(of: "}"), open < close,
              let lists = (try? JSONSerialization.jsonObject(with: Data(text[open...close].utf8))) as? [String: [String]] else { return [:] }
        return lists
    }()

    /// A made-up one of `kind` for `real` (FNV-1a over its UTF-16 units, as app.js picks).
    static func fake(_ kind: String, _ real: String) -> String {
        guard !real.isEmpty, let list = names[kind] ?? names["title"], !list.isEmpty else { return real }
        var h: UInt32 = 0x811c9dc5
        for unit in real.utf16 {
            h ^= UInt32(unit)
            h = h &* 0x01000193
        }
        return list[Int(h % UInt32(list.count))]
    }

    /// A folder's made-up project, by its last part, as the dashboard names it.
    static func project(_ path: String) -> String {
        let last = (path as NSString).lastPathComponent
        return fake("project", last.isEmpty ? path : last)
    }

    /// Where the dashboard says a folder is: ~/code/<project>.
    static func folder(_ path: String) -> String { path.isEmpty ? path : "~/code/" + project(path) }

    /// A tool call's text by its kind (the categories app.js and Theme.catLabel know), or a prompt's, or a reply's.
    static func call(_ kind: String, _ text: String) -> String {
        switch kind {
        case "web": return fake("search", text)
        case "browser": return fake("url", text)
        case "read", "edit": return fake("file", text)
        case "search": return fake("grep", text)
        case "bash", "shell": return fake("cmd", text)
        case "agent", "agents": return fake("agent", text)
        case "mcp": return fake("mcp", text)
        case "plan": return fake("plan", text)
        case "claude", "reply", "say", "sys", "system": return fake("reply", text)
        default: return fake("title", text)
        }
    }
}
