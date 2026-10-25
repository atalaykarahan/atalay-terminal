import Foundation

struct Pending {
    let n: String, c: String, l: String, t: Double
    var dict: [String: Any] { ["n": n, "c": c, "l": l, "t": t] }
}

/// Shared counters for a session or one of its subagents (today only).
class Track {
    var tokIn = 0, tokOut = 0, tokCr = 0, tokCw = 0
    var cost = 0.0, tools = 0, errors = 0, web = 0, prompts = 0
    var byCat: [String: Int] = [:]
    var spark: [Int: Int] = [:]
    var pending: [(id: String, p: Pending)] = []
    var last: Pending?
    var sig: [String] = []
    var model = ""
    var endTurn = false
    var firstTs = 0.0, lastTs = 0.0

    func resetCounters() {
        tokIn = 0; tokOut = 0; tokCr = 0; tokCw = 0
        cost = 0; tools = 0; errors = 0; web = 0; prompts = 0
        byCat = [:]; spark = [:]
    }

    func addTok(_ i: Int, _ o: Int, _ r: Int, _ w: Int) {
        tokIn += i; tokOut += o; tokCr += r; tokCw += w
    }

    var tokDict: [String: Any] { ["in": tokIn, "out": tokOut, "cr": tokCr, "cw": tokCw] }

    func pendingGet(_ id: String) -> Pending? { pending.first(where: { $0.id == id })?.p }
    func pendingRemove(_ id: String) { pending.removeAll(where: { $0.id == id }) }
    func pendingSet(_ id: String, _ p: Pending) {
        pendingRemove(id)
        pending.append((id, p))
    }

    var isLoop: Bool { sig.count >= 3 && sig.suffix(3).allSatisfy { $0 == sig.last } }
}

final class Session: Track {
    let id: String
    var name = "", title = "", lastPrompt = "", cwd = "", branch = "", effort = ""
    var live = false
    var reg: String?
    var waitingFor: String?
    var statusSince = 0.0
    var pid: Int32?, ppid: Int32?
    /// `updatedAt` of the registry entry that carries this chat. Two live processes can hold one conversation (a
    /// `--resume` that didn't fork); the one updated last carries the card.
    var regUpdated = 0.0
    var tty: String?
    var cpu = 0.0, mem = 0
    var kind = "", entry = ""
    var ctx = 0, ctxMax = 0.0, turnMs = 0.0, endedAt = 0.0
    var hostTab: String?
    /// The session this conversation continues in: Claude resumed it under a new session id.
    var supersededBy: String?

    init(id: String) { self.id = id }
}

final class SubAgent: Track {
    let key: String, id: String, sid: String
    var desc = "", type = "", bg = false

    init(sid: String, id: String) {
        self.sid = sid
        self.id = id
        self.key = "\(sid):\(id)"
    }
}

final class Cursor {
    let path: String
    var off: UInt64 = 0
    var rest = Data()
    var sid: String?
    var agentId: String?
    var started = false
    var skipLine = false

    init(path: String) { self.path = path }
}

final class LogEntry {
    var dict: [String: Any]
    init(_ dict: [String: Any]) { self.dict = dict }
    var t: Double { dict["t"] as? Double ?? 0 }
}

final class FileHeat {
    let p: String
    var r = 0, w = 0, last = 0.0
    var editors: [String: (t: Double, s: String, a: String?)] = [:]
    init(p: String) { self.p = p }
}

final class Minute {
    var tools = 0, tok = 0, cost = 0.0
    var cats: [String: Int] = [:]
}

final class ModelAgg {
    let model: String, priced: Bool
    var tokIn = 0, tokOut = 0, tokCr = 0, tokCw = 0, cost = 0.0, calls = 0
    init(model: String, priced: Bool) {
        self.model = model
        self.priced = priced
    }
}

final class Globals {
    var cost = 0.0, saved = 0.0
    var tokIn = 0, tokOut = 0, tokCr = 0, tokCw = 0
    var tools = 0, errors = 0, prompts = 0, web = 0, turns = 0, turnMs = 0.0
    var byCat: [String: Int] = Dictionary(uniqueKeysWithValues: CATS.map { ($0, 0) })
    var lastByCat: [String: [String: Any]] = [:]
    var research: [[String: Any]] = []
    var shells: [[String: Any]] = []
    var ticker: [[String: Any]] = []
    var files: [String: FileHeat] = [:]
    var minutes: [Int: Minute] = [:]
    var byModel: [String: ModelAgg] = [:]
}

/// What the native UI (chat windows, dock badge, sidebar) needs about a session.
struct SessionBrief: Equatable {
    let id: String
    let name: String
    let title: String
    let status: String
    let waitingFor: String?
    let cwd: String
    let live: Bool
    let pid: Int32?
    let host: String?
    /// Id of the in-app chat window running this session, if any.
    let tab: String?
    var model = ""
    var effort = ""
    var ctx = 0
    var ctxMax = 0.0
    var cost = 0.0
    var tools = 0
    var web = 0
    var errors = 0
    var statusSince = 0.0
    var turnMs = 0.0
    var spark: [Int] = []
    var agentsRunning = 0
    /// Tool running right now: name, category, label, start (ms).
    var actionName = ""
    var actionCat = ""
    var actionLabel = ""
    var actionSince = 0.0
}

/// Live event for the native chat windows (tool calls, results, prompts, replies).
struct NativeEvent {
    let sid: String
    let id: String?
    let kind: String
    let cat: String?
    let name: String?
    let label: String
    let ok: Bool?
    let dur: Double?
    let meta: String
}

/// One saved conversation on disk, for the sidebar.
struct ChatItem: Identifiable, Equatable {
    let id: String
    var path: String
    var cwd: String
    var mtime: Double
    var size: Int
    var title: String
    var lastPrompt: String
}
