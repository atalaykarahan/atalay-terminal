import Foundation
import SQLite3

/// A chat deleted from the chats list (Sidebar.swift): Claude Code's, Codex's or Antigravity's. It leaves the list at
/// once and stays in Settings' deleted chats for 30 days, where it can be put back; then it's deleted from the Mac. Until
/// then nothing of the conversation is touched, so putting it back is only taking it off this list.
struct TrashedChat: Equatable {
    let id: String
    var title: String
    var cwd: String
    /// "claude", "codex" or "antigravity" (ChatItem.tool).
    var tool: String
    /// Its transcript (Codex's: its log) when it was deleted.
    var path: String
    /// When it was deleted (ms).
    var at: Double

    init(id: String, title: String, cwd: String, tool: String = "claude", path: String, at: Double) {
        self.id = id
        self.title = title
        self.cwd = cwd
        self.tool = tool
        self.path = path
        self.at = at
    }

    init?(id: String, saved: [String: Any]) {
        guard let path = saved["path"] as? String, let at = saved["at"] as? Double else { return nil }
        self.init(id: id, title: saved["title"] as? String ?? "", cwd: saved["cwd"] as? String ?? "",
                  tool: saved["tool"] as? String ?? "claude", path: path, at: at)
    }

    var saved: [String: Any] { ["title": title, "cwd": cwd, "tool": tool, "path": path, "at": at] }
}

enum ChatTrash {
    /// How long a deleted chat is kept.
    static let keep: Double = 30 * 86_400_000
    private static let key = "chatTrash"

    static func load(_ defaults: UserDefaults = .standard) -> [String: TrashedChat] {
        var all: [String: TrashedChat] = [:]
        for (id, saved) in defaults.dictionary(forKey: key) ?? [:] {
            if let saved = saved as? [String: Any], let chat = TrashedChat(id: id, saved: saved) { all[id] = chat }
        }
        return all
    }

    static func save(_ all: [String: TrashedChat], _ defaults: UserDefaults = .standard) {
        defaults.set(all.mapValues(\.saved), forKey: key)
    }

    /// Whole days left before a chat deleted at `at` is deleted for good: 30 on the day it's deleted, 1 on its last.
    static func daysLeft(_ at: Double, now: Double) -> Int {
        max(0, Int(((at + keep - now) / 86_400_000).rounded(.up)))
    }

    /// Whether its 30 days are over.
    static func expired(_ chat: TrashedChat, now: Double) -> Bool { now - chat.at >= keep }

    /// A conversation's id as all three tools write it (8-4-4-4-12 hex digits), and the name their files go by. Nothing
    /// is ever deleted by a name that isn't one: an empty or odd one would name a whole folder.
    static func isSessionId(_ id: String) -> Bool {
        let parts = id.split(separator: "-", omittingEmptySubsequences: false)
        guard parts.map(\.count) == [8, 4, 4, 4, 12] else { return false }
        return parts.allSatisfy { $0.allSatisfy(\.isHexDigit) }
    }

    /// Whether the part of `path` under `root` is plain names (no "..", "." or empty one), `count` of them.
    private static func plain(_ path: String, under root: String, count: Int? = nil) -> Bool {
        guard root.count > 1, path.hasPrefix(root + "/") else { return false }
        let rest = path.dropFirst(root.count + 1).split(separator: "/", omittingEmptySubsequences: false)
        return !rest.contains { $0.isEmpty || $0 == "." || $0 == ".." } && (count == nil || rest.count == count)
    }

    private static func exists(_ p: String) -> Bool { (try? FileManager.default.attributesOfItem(atPath: p)) != nil }

    private static func modified(_ p: String) -> Double? {
        ((try? FileManager.default.attributesOfItem(atPath: p))?[.modificationDate] as? Date).map { $0.timeIntervalSince1970 * 1000 }
    }

    // MARK: Claude Code (~/.claude)

    /// Claude's own folders under `root` (~/.claude), as the engine writes them.
    private static func folder(_ name: String, in root: String) -> String { (root as NSString).appendingPathComponent(name) }

    /// Whether `path` is a transcript in Claude's projects folder under `root`: projects/<folder>/<name>.jsonl, nothing
    /// else. The folder beside a transcript goes by its name without the ending, so a file named only ".jsonl" would
    /// name its whole project folder: that isn't one.
    static func isTranscript(_ path: String, root: String = CLAUDE_DIR) -> Bool {
        let projects = folder("projects", in: root)
        guard path.hasSuffix(".jsonl"), plain(path, under: projects, count: 2) else { return false }
        return (path as NSString).lastPathComponent.count > ".jsonl".count
    }

    /// Everything Claude Code keeps of one conversation under `root`: its transcript and the folder beside it (its
    /// subagents and tool results), in whichever project folders have them; its file checkpoints, its shell
    /// environment, its tasks and to-dos, its pasted images and its debug log. Claude's prompt history
    /// (history.jsonl, the ↑ key's) stays: every running Claude writes to that one file.
    static func claudeFiles(of chat: TrashedChat, root: String = CLAUDE_DIR) -> [String] {
        let fm = FileManager.default
        var out: [String] = []
        func add(_ p: String) {
            // A link counts too, where it points or not: it's the link that goes.
            if !out.contains(p), exists(p) { out.append(p) }
        }
        if isTranscript(chat.path, root: root) {
            add(chat.path)
            add(String(chat.path.dropLast(".jsonl".count)))
        }
        guard isSessionId(chat.id), root.count > 1 else { return out }
        let projects = folder("projects", in: root)
        for name in (try? fm.contentsOfDirectory(atPath: projects)) ?? [] {
            add("\(projects)/\(name)/\(chat.id).jsonl")
            add("\(projects)/\(name)/\(chat.id)")
        }
        for sub in ["file-history", "session-env", "tasks", "image-cache"] { add("\(folder(sub, in: root))/\(chat.id)") }
        add("\(folder("debug", in: root))/\(chat.id).txt")
        let todos = folder("todos", in: root)
        for name in (try? fm.contentsOfDirectory(atPath: todos)) ?? [] where name.hasPrefix(chat.id + "-") {
            add("\(todos)/\(name)")
        }
        return out
    }

    // MARK: Codex (~/.codex, or CODEX_HOME)

    static var codexHome: String { ProcessInfo.processInfo.environment["CODEX_HOME"] ?? (HOME as NSString).appendingPathComponent(".codex") }

    /// Whether `path` is the log Codex keeps of conversation `id`: sessions/…/rollout-…-<id>.jsonl in its folder.
    static func isCodexLog(_ path: String, id: String, home: String = codexHome) -> Bool {
        let name = (path as NSString).lastPathComponent
        return isSessionId(id) && plain(path, under: (home as NSString).appendingPathComponent("sessions"))
            && name.hasPrefix("rollout-") && name.hasSuffix("-\(id).jsonl")
    }

    /// Codex deletes its own conversation (`codex delete --force <id>`: its log and its entry in its state database);
    /// without Codex on the Mac any more, its log goes. True when the log is gone.
    private static func eraseCodex(_ chat: TrashedChat, home: String) -> Bool {
        guard isSessionId(chat.id) else { return false }
        if let codex = CodexUsage.codexExecutable() {
            let p = Process()
            p.executableURL = URL(fileURLWithPath: codex)
            p.arguments = ["delete", "--force", chat.id]
            p.currentDirectoryURL = URL(fileURLWithPath: HOME)
            p.standardInput = FileHandle.nullDevice
            p.standardOutput = FileHandle.nullDevice
            p.standardError = FileHandle.nullDevice
            let done = DispatchSemaphore(value: 0)
            p.terminationHandler = { _ in done.signal() }
            if (try? p.run()) != nil, done.wait(timeout: .now() + 30) == .timedOut {
                p.terminate()
            }
        }
        // Codex didn't (it's gone, or it doesn't know this one any more): its log goes all the same.
        if isCodexLog(chat.path, id: chat.id, home: home), exists(chat.path) {
            try? FileManager.default.removeItem(atPath: chat.path)
        }
        return !(isCodexLog(chat.path, id: chat.id, home: home) && exists(chat.path))
    }

    // MARK: Antigravity (~/.gemini/antigravity-cli)

    static var agyRoot: String { (HOME as NSString).appendingPathComponent(".gemini/antigravity-cli") }

    /// A conversation's subagents' conversations (theirs too), from Antigravity's list of conversations.
    static func agyChildren(of id: String, root: String = agyRoot) -> [String] {
        guard isSessionId(id), let db = open(root + "/conversation_summaries.db", write: false) else { return [] }
        defer { sqlite3_close(db) }
        var out: [String] = [], next = [id]
        while let parent = next.popLast(), out.count < 200 {
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, "SELECT conversation_id FROM conversation_summaries WHERE parent_conversation_id = ?", -1, &stmt, nil) == SQLITE_OK else { break }
            sqlite3_bind_text(stmt, 1, parent, -1, SQLITE_TRANSIENT)
            while sqlite3_step(stmt) == SQLITE_ROW {
                if let c = sqlite3_column_text(stmt, 0).map({ String(cString: $0) }), isSessionId(c), c != id, !out.contains(c) {
                    out.append(c)
                    next.append(c)
                }
            }
            sqlite3_finalize(stmt)
        }
        return out
    }

    /// The files Antigravity keeps of these conversations: each one's own database, its folder (transcript, steps,
    /// subagents, scratch files), its annotations and its lock.
    static func agyFiles(_ ids: [String], root: String = agyRoot) -> [String] {
        var out: [String] = []
        for id in ids where isSessionId(id) {
            for p in ["conversations/\(id).db", "conversations/\(id).db-wal", "conversations/\(id).db-shm", "conversations/\(id).db-journal",
                      "brain/\(id)", "annotations/\(id).pbtxt", "presence/\(id).lock"] where exists(root + "/" + p) {
                out.append(root + "/" + p)
            }
        }
        return out
    }

    /// These conversations out of Antigravity's list of them (and its search index), so neither it nor the chats list
    /// shows them any more. True when that's done (or there's no list).
    static func agyForget(_ ids: [String], root: String = agyRoot) -> Bool {
        let ids = ids.filter(isSessionId)
        let path = root + "/conversation_summaries.db"
        guard !ids.isEmpty, exists(path) else { return true }
        guard let db = open(path, write: true) else { return false }
        defer { sqlite3_close(db) }
        var tables = Set<String>()
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, "SELECT name FROM sqlite_master WHERE type = 'table'", -1, &stmt, nil) == SQLITE_OK {
            while sqlite3_step(stmt) == SQLITE_ROW {
                if let t = sqlite3_column_text(stmt, 0) { tables.insert(String(cString: t)) }
            }
        }
        sqlite3_finalize(stmt)
        guard sqlite3_exec(db, "BEGIN IMMEDIATE", nil, nil, nil) == SQLITE_OK else { return false }
        for table in ["conversation_summaries", "conversations_fts"] where tables.contains(table) {
            for id in ids {
                var del: OpaquePointer?
                let ok = sqlite3_prepare_v2(db, "DELETE FROM \(table) WHERE conversation_id = ?", -1, &del, nil) == SQLITE_OK
                    && sqlite3_bind_text(del, 1, id, -1, SQLITE_TRANSIENT) == SQLITE_OK
                    && sqlite3_step(del) == SQLITE_DONE
                sqlite3_finalize(del)
                if !ok {
                    sqlite3_exec(db, "ROLLBACK", nil, nil, nil)
                    return false
                }
            }
        }
        return sqlite3_exec(db, "COMMIT", nil, nil, nil) == SQLITE_OK
    }

    /// These conversations out of Antigravity's caches: its metadata of each, and the conversation `agy -c` would
    /// continue in a folder.
    private static func agyCacheForget(_ ids: [String], root: String) {
        let gone = Set(ids)
        func rewrite(_ name: String, _ change: (inout [String: Any]) -> Bool) {
            let path = root + "/cache/" + name
            guard let data = FileManager.default.contents(atPath: path),
                  var j = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], change(&j),
                  let out = try? JSONSerialization.data(withJSONObject: j, options: [.prettyPrinted, .sortedKeys]) else { return }
            try? out.write(to: URL(fileURLWithPath: path), options: .atomic)
        }
        rewrite("conversation_metadata.json") { j in
            guard var all = j["conversations"] as? [String: Any], !gone.isDisjoint(with: all.keys) else { return false }
            for id in gone { all[id] = nil }
            j["conversations"] = all
            return true
        }
        rewrite("last_conversations.json") { j in
            let before = j.count
            j = j.filter { !($0.value is String && gone.contains($0.value as! String)) }
            return j.count != before
        }
    }

    /// Deletes an Antigravity conversation and its subagents': out of its list first, then their files. True when its
    /// database is gone and it's out of the list.
    private static func eraseAgy(_ chat: TrashedChat, root: String) -> Bool {
        guard isSessionId(chat.id) else { return false }
        let ids = [chat.id] + agyChildren(of: chat.id, root: root)
        // Out of its list first: a conversation listed with its files gone would show there, and wouldn't open.
        guard agyForget(ids, root: root) else { return false }
        for p in agyFiles(ids, root: root) { try? FileManager.default.removeItem(atPath: p) }
        agyCacheForget(ids, root: root)
        return !exists(root + "/conversations/\(chat.id).db")
    }

    private static func open(_ path: String, write: Bool) -> OpaquePointer? {
        var db: OpaquePointer?
        guard sqlite3_open_v2(path, &db, write ? SQLITE_OPEN_READWRITE : SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
            sqlite3_close(db)
            return nil
        }
        // Antigravity may be writing to it: wait for it a little.
        sqlite3_busy_timeout(db, 3000)
        return db
    }

    private static let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

    // MARK: any tool

    /// The files a deleted chat has on the Mac (its transcript first), whichever tool's.
    static func files(of chat: TrashedChat) -> [String] {
        switch chat.tool {
        case "codex": return isCodexLog(chat.path, id: chat.id) && exists(chat.path) ? [chat.path] : []
        case "antigravity": return agyFiles([chat.id] + agyChildren(of: chat.id))
        default: return claudeFiles(of: chat)
        }
    }

    /// Deletes a conversation from the Mac, for good. True when it's gone (else it's tried again later).
    @discardableResult
    static func erase(_ chat: TrashedChat) -> Bool {
        switch chat.tool {
        case "codex": return eraseCodex(chat, home: codexHome)
        case "antigravity": return eraseAgy(chat, root: agyRoot)
        default:
            for p in claudeFiles(of: chat) { try? FileManager.default.removeItem(atPath: p) }
            return !claudeFiles(of: chat).contains { $0.hasSuffix(".jsonl") }
        }
    }

    /// When the conversation was last written (ms), nil when it's gone.
    static func lastWritten(_ chat: TrashedChat) -> Double? {
        switch chat.tool {
        case "codex":
            return isCodexLog(chat.path, id: chat.id) ? modified(chat.path) : nil
        case "antigravity":
            guard isSessionId(chat.id) else { return nil }
            let root = agyRoot
            return [root + "/conversations/\(chat.id).db", root + "/brain/\(chat.id)/.system_generated/logs/transcript.jsonl"]
                .compactMap(modified).max()
        default:
            return claudeFiles(of: chat).filter { $0.hasSuffix(".jsonl") }.compactMap(modified).max()
        }
    }

    /// What each chat in the trash is due now: nothing while its 30 days run; then deleted for good, unless it was
    /// written to after it was deleted (continued in a terminal while the app was closed): that one comes back to the
    /// list instead.
    static func due(_ all: [String: TrashedChat], now: Double) -> (erase: [TrashedChat], putBack: [TrashedChat]) {
        var erase: [TrashedChat] = [], putBack: [TrashedChat] = []
        for chat in all.values where expired(chat, now: now) {
            if let written = lastWritten(chat), written > chat.at { putBack.append(chat) } else { erase.append(chat) }
        }
        return (erase, putBack)
    }
}
