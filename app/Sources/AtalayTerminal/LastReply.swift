import Foundation

/// Claude's last reply in a conversation, read from its transcript: the text of everything Claude said since the last
/// thing you wrote. Claude's full-screen view keeps its history inside Claude, so on the terminal a reply can only be
/// selected as far as it fits the window; this gets the whole of it (the chat window's copy button, ⇧⌘C).
enum LastReply {
    static func text(sessionId: String) -> String? {
        guard let file = transcript(sessionId), let tail = readTail(file, 4 << 20) else { return nil }
        var parts: [String] = []
        for line in tail.split(separator: "\n").reversed() {
            guard let rec = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
                  rec["isSidechain"] as? Bool != true else { continue }
            let content = (rec["message"] as? [String: Any])?["content"]
            switch rec["type"] as? String {
            case "assistant":
                let texts = (content as? [[String: Any]] ?? []).filter { $0["type"] as? String == "text" }.compactMap { $0["text"] as? String }
                parts.insert(contentsOf: texts.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }, at: 0)
            case "user":
                // What you wrote ends the reply; a tool's result is part of it.
                if content is String { return joined(parts) }
                if let blocks = content as? [[String: Any]], blocks.contains(where: { $0["type"] as? String == "text" }),
                   rec["isMeta"] as? Bool != true { return joined(parts) }
            default: break
            }
        }
        return joined(parts)
    }

    private static func joined(_ parts: [String]) -> String? {
        parts.isEmpty ? nil : parts.joined(separator: "\n\n")
    }

    /// The conversation's file, in whichever project folder Claude keeps it.
    private static func transcript(_ sessionId: String) -> String? {
        let projects = CLAUDE_DIR + "/projects"
        let name = sessionId + ".jsonl"
        for dir in (try? FileManager.default.contentsOfDirectory(atPath: projects)) ?? [] {
            let path = projects + "/" + dir + "/" + name
            if FileManager.default.fileExists(atPath: path) { return path }
        }
        return nil
    }

    /// The last `max` bytes of a file, from the first whole line in them.
    private static func readTail(_ path: String, _ max: Int) -> String? {
        guard let h = FileHandle(forReadingAtPath: path) else { return nil }
        defer { try? h.close() }
        let size = (try? h.seekToEnd()) ?? 0
        let start = size > UInt64(max) ? size - UInt64(max) : 0
        try? h.seek(toOffset: start)
        guard let data = try? h.readToEnd() else { return nil }
        // A character cut in two at the start only spoils the first line, which goes.
        var text = String(decoding: data, as: UTF8.self)
        if start > 0, let nl = text.firstIndex(of: "\n") { text = String(text[text.index(after: nl)...]) }
        return text
    }
}
