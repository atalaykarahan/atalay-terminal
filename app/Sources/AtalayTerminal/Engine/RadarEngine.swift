import CoreServices
import Foundation
import SQLite3

/// Reads ~/.claude live: the session registry (who is running, busy/idle/waiting) and the
/// transcripts (every prompt, tool call, result and token count). Read-only; runs on its own queue.
final class RadarEngine {
    let claudeDir: String
    let projects: String
    let registry: String
    let queue = DispatchQueue(label: "atalay.radar.engine", qos: .utility)

    /// Called on the main thread.
    var onInit: ((String) -> Void)?
    var onState: ((String, [SessionBrief]) -> Void)?
    var onEvents: ((String) -> Void)?
    var onNativeEvents: (([NativeEvent]) -> Void)?
    var onHistory: (([ChatItem]) -> Void)?

    private static let bigFile: UInt64 = 8 << 20
    private static let chunk = 4 << 20
    private static let MIN = 60_000.0

    private var booted = false
    private var initWanted = false
    private var day0 = dayStart()
    private var sessions: [String: Session] = [:]
    private var agents: [String: SubAgent] = [:]
    private var cursors: [String: Cursor] = [:]
    private var seenMsg = Set<String>()
    /// Record uuids already counted. A forked session starts its transcript with a copy of the parent's
    /// history; counting it again duplicated research items and flagged the parent's files as collisions.
    /// Session of every record uuid seen. A session repeating another one's records continues that chat.
    private var recOwner: [String: String] = [:]
    private var agentHints: [String: (desc: String, type: String)] = [:]
    private var log: [LogEntry] = []
    private var logIndex: [String: LogEntry] = [:]
    private var outbox: [[String: Any]] = []
    private var G = Globals()
    private var appShells: [Int32: String] = [:]
    /// Usage limits last read from Claude Code's status line, by the file's mtime.
    private var limits: (mtime: Double, json: [String: Any]?) = (-1, nil)
    /// Sessions ended from a chat window, by the pid of the Claude that was ended (0 if none ran).
    private var dismissed: [String: Int32] = [:]
    private var timers: [DispatchSourceTimer] = []
    private var stream: FSEventStreamRef?
    private var history: [String: ChatItem] = [:]
    private var lastScan = 0.0
    /// Registry file name -> what it said last time, so unchanged files are not re-read.
    private var regCache: [String: (mtime: Double, sid: String, pid: Int32, chat: Bool)] = [:]
    private var regPending = false
    private var agyPending = false
    private var historyPending = false
    private var flushPending = false
    private var stateDirty = true
    private var lastStateJSON = ""
    private var lastStateAt = 0.0
    private var cpuSeen: [Int32: (ns: UInt64, at: Double)] = [:]
    /// Other AI tools running (Codex, Gemini…), by session id ("ai:<pid>:<start>").
    private var others: [String: OtherAI] = [:]
    private var otherCpu: [Int32: (ns: UInt64, at: Double)] = [:]
    /// What of their records today's counts already have (otherOnce), and their calls by name, for their results.
    private var otherSeen = Set<String>()
    private var otherCalls: [String: (p: Pending, done: Bool)] = [:]
    /// Their chats and subagents that worked today (the top bar's "today" counts), by id.
    private var otherChatsToday = Set<String>(), otherAgentsToday = Set<String>()
    /// Fresh account-wide Codex limits, read from Codex app-server rather than inferred from a rollout file. The last one
    /// read is kept on disk, so the top bar shows them while no Codex runs too.
    private var codexUsage: [String: Any]? = Limits.load("codex")
    private var codexUsagePending = false, codexWasRunning = false
    /// Codex approvals the user hasn't answered yet (CodexHooks), by Codex session id, and when each Codex last logged a
    /// tool's output (an answer to them), by its id.
    private var codexWaits: [String: (command: String, since: Double)] = [:]
    private var codexOutputAt: [String: Double] = [:]
    private var codexWaitPending = false
    /// Antigravity's limits by group of models (AgyUsage), kept the same way, and the model its chats used last: the group
    /// that binds.
    private var agyUsage: [String: Any]? = Limits.load("antigravity")
    private var agyUsagePending = false, agyWasRunning = false
    private var agyModel = Limits.load("antigravity")?["model"] as? String ?? ""
    /// Each Antigravity CLI's own log, read on, by its session id: the confirmation or question it shows right now (the
    /// step it asks about, the tool, since when), and its turn as the log tells it (working, or idle since when) with the
    /// conversation it sent the user's message to.
    private var agyConfirms: [String: (log: String, offset: UInt64, pending: (step: Int, tool: String, since: Double)?)] = [:]
    private var agyTurns: [String: (working: Bool?, since: Double, conversation: String?)] = [:]
    /// Spend by day and project past today (the spend panel's history); read on the engine's queue only.
    private lazy var ledger = Ledger()

    init() {
        claudeDir = CLAUDE_DIR
        projects = (claudeDir as NSString).appendingPathComponent("projects")
        registry = (claudeDir as NSString).appendingPathComponent("sessions")
    }

    // MARK: public API (any thread)

    /// The first index is what the dashboard waits for, so it runs as user-initiated work and keeps App Nap
    /// off until it is done (napping, a background app's utility-priority reads crawled for minutes).
    /// Everything after it runs at utility priority, which macOS keeps on the efficiency cores.
    func start() {
        Limits.installScript()
        CodexHooks.install()
        let activity = ProcessInfo.processInfo.beginActivity(options: [.userInitiated], reason: "Indexing Claude Code transcripts")
        queue.async(qos: .userInitiated) {
            self.boot()
            ProcessInfo.processInfo.endActivity(activity)
        }
    }

    func requestInit() {
        queue.async {
            if self.booted { self.sendInit() } else { self.initWanted = true }
        }
    }

    /// Shell pid of every in-app terminal tab, so their Claude sessions can be matched by parent pid.
    func setAppShells(_ map: [Int32: String]) {
        queue.async {
            self.appShells = map
            self.matchTabs()
        }
    }

    func refreshHistorySoon() { queue.async { self.scanHistory(force: false) } }

    /// The user ended this session in a chat window: it leaves the dashboard now, instead of once Claude has
    /// exited and then another 30 minutes as "ended", where a click would resume it again. It comes back if
    /// the conversation is resumed later (another Claude process).
    func dismiss(sessionId: String, pid: Int32?) {
        queue.async {
            self.dismissed[sessionId] = pid ?? 0
            self.stateDirty = true
            self.publishState()
        }
    }

    // MARK: boot & timers

    private func boot() {
        let t0 = Date()
        pollRegistry()
        var files = Set(collectFiles(since: day0))
        for S in sessions.values where S.live { files.insert(transcriptFor(S.cwd, S.id)) }
        // Oldest transcript first, so copied history is credited to the session that made it, not its fork.
        let born: (String) -> Date = { ((try? FileManager.default.attributesOfItem(atPath: $0))?[.creationDate] as? Date) ?? .distantFuture }
        for fp in files.sorted(by: { born($0) < born($1) }) where FileManager.default.fileExists(atPath: fp) { pump(fp) }
        settleRings()
        booted = true
        pollProcesses()
        NSLog("atalay-terminal: indexed %d transcripts in %.1fs", files.count, Date().timeIntervalSince(t0))
        if initWanted { sendInit() }
        scanHistory(force: true)
        startWatch()
        lastScan = nowMs()
        refreshCodexUsage()
        refreshAgyUsage()
        // FSEvents delivers transcript and registry changes as they happen; these timers are only
        // slow safety nets. Their leeway lets macOS batch the wake-ups with other work.
        every(5) { self.pollRegistry() }
        every(3) { self.pollProcesses() }
        every(10) {
            let now = nowMs()
            for c in self.cursors.values where now - (self.sessions[c.sid ?? ""]?.lastTs ?? 0) < 30 * Self.MIN {
                self.pump(c.path)
            }
        }
        every(60) {
            let since = self.lastScan - 5000
            self.lastScan = nowMs()
            for fp in self.collectFiles(since: since) { self.pump(fp) }
        }
        every(120) { self.scanHistory(force: false) }
        every(60) {
            self.refreshCodexUsage()
            self.refreshAgyUsage()
        }
        every(60) { self.maybeNewDay() }
        every(1) { self.publishState() }
        scheduleLedger()
        every(3600) { self.readLedger() }
    }

    private func every(_ seconds: Double, _ block: @escaping () -> Void) {
        let t = DispatchSource.makeTimerSource(queue: queue)
        t.schedule(deadline: .now() + seconds, repeating: seconds, leeway: .milliseconds(Int(max(50, seconds * 100))))
        t.setEventHandler(handler: block)
        t.resume()
        timers.append(t)
    }

    /// Codex app-server reads the authenticated account's current server-side rate limits. Keep this off the
    /// transcript/indexing queue: starting the local app-server and waiting for its response can take a moment.
    /// Only while a Codex runs, as each read starts Codex itself; in between the last one read shows, with its time (the
    /// page drops a window's number once its reset has passed).
    private func refreshCodexUsage() {
        guard !codexUsagePending, codexRunning else { return }
        codexUsagePending = true
        DispatchQueue.global(qos: .utility).async {
            let fresh = CodexUsage.read()
            self.queue.async {
                self.codexUsagePending = false
                guard let fresh else { return }
                self.codexUsage = fresh
                Limits.save(fresh, as: "codex")
                self.stateDirty = true
                self.publishState()
            }
        }
    }

    private var codexRunning: Bool { others.values.contains { $0.tool == "Codex" && $0.endedAt == 0 } }

    /// Antigravity's limits, the same way: only while an Antigravity chat runs, each read a run of its CLI (~3 s).
    private func refreshAgyUsage() {
        // Not while an Antigravity turn works: each `agy -p /usage` writes the conversation's summary back as idle.
        guard !agyUsagePending, agyRunning, !others.values.contains(where: { $0.tool == "Antigravity" && $0.endedAt == 0 && $0.turnOpen == true })
        else { return }
        agyUsagePending = true
        DispatchQueue.global(qos: .utility).async {
            let fresh = AgyUsage.read()
            self.queue.async {
                self.agyUsagePending = false
                guard let fresh else { return }
                self.agyUsage = fresh
                Limits.save(fresh.merging(["model": self.agyModel]) { $1 }, as: "antigravity")
                self.stateDirty = true
                self.publishState()
            }
        }
    }

    private var agyRunning: Bool { others.values.contains { $0.tool == "Antigravity" && $0.endedAt == 0 } }

    /// Codex's approval requests still waiting for the user: its hook's, less those its own log says were answered.
    private func refreshCodexWaits() {
        var waits = CodexHooks.waiting()
        for (session, wait) in waits where CodexHooks.answered(session: session, since: wait.since) {
            waits[session] = nil
            CodexHooks.drop(session: session, since: wait.since)
        }
        codexWaits = waits
    }

    /// A Codex asked for an approval, or its answer came: its planet waits, or works again, now.
    private func codexWaitChanged() {
        guard !codexWaitPending else { return }
        codexWaitPending = true
        queue.asyncAfter(deadline: .now() + 0.05) {
            self.codexWaitPending = false
            self.refreshCodexWaits()
            let ms = nowMs()
            for O in self.others.values where O.tool == "Codex" && O.endedAt == 0 {
                let shown = self.otherStatus(O, ms).status
                if shown != O.shown {
                    O.shown = shown
                    O.statusSince = ms
                    self.stateDirty = true
                }
            }
            self.publishState()
        }
    }

    private func registryChanged() {
        guard !regPending else { return }
        regPending = true
        queue.asyncAfter(deadline: .now() + 0.05) {
            self.regPending = false
            self.pollRegistry()
            self.publishState()
        }
    }

    private func agyChanged() {
        guard !agyPending else { return }
        agyPending = true
        queue.asyncAfter(deadline: .now() + 0.05) {
            self.agyPending = false
            let ms = nowMs()
            let agyList = self.others.values.filter { $0.tool == "Antigravity" && $0.endedAt == 0 && !$0.cwd.isEmpty }.sorted { $0.firstTs < $1.firstTs }
            for O in agyList {
                self.readAntigravity(O, cwd: O.cwd)
                let shown = self.otherStatus(O, ms).status
                if shown != O.shown {
                    O.shown = shown
                    O.statusSince = ms
                    self.stateDirty = true
                }
            }
            self.publishState()
        }
    }

    private func historyChanged() {
        guard !historyPending else { return }
        historyPending = true
        queue.asyncAfter(deadline: .now() + 8, qos: .background) {
            self.historyPending = false
            self.scanHistory(force: false)
        }
    }

    private var codexPending = false
    private static var codexSessionsRoot: String {
        (ProcessInfo.processInfo.environment["CODEX_HOME"] ?? HOME + "/.codex") + "/sessions"
    }

    private func codexChanged() {
        guard !codexPending else { return }
        codexPending = true
        queue.asyncAfter(deadline: .now() + 0.1) {
            self.codexPending = false
            let ms = nowMs()
            for O in self.others.values where O.tool == "Codex" && O.endedAt == 0 {
                self.readCodexLog(O, cwd: O.cwd, since: O.firstTs / 1000, now: ms)
                let shown = self.otherStatus(O, ms).status
                if shown != O.shown {
                    O.shown = shown
                    O.statusSince = ms
                    self.stateDirty = true
                }
            }
            self.publishState()
        }
    }

    private func startWatch() {
        let agyRoot = HOME + "/.gemini/antigravity-cli"
        var ctx = FSEventStreamContext(version: 0, info: Unmanaged.passUnretained(self).toOpaque(), retain: nil, release: nil, copyDescription: nil)
        let callback: FSEventStreamCallback = { _, info, _, paths, _, _ in
            guard let info else { return }
            let engine = Unmanaged<RadarEngine>.fromOpaque(info).takeUnretainedValue()
            let agyDir = HOME + "/.gemini/antigravity-cli"
            let list = unsafeBitCast(paths, to: NSArray.self)
            for case let p as String in list {
                if p.hasPrefix(RadarEngine.codexSessionsRoot + "/") {
                    if p.hasSuffix(".jsonl") { engine.codexChanged() }
                } else if p.hasPrefix(HOME + "/.codex/") {
                    // Codex's own log database: the user's answer to a request waiting on screen lands there.
                    if p.hasPrefix(CodexHooks.logDatabase), !engine.codexWaits.isEmpty { engine.codexWaitChanged() }
                } else if p.hasPrefix(agyDir) {
                    engine.agyChanged()
                    if p.hasSuffix("conversation_summaries.db") || p.hasSuffix("conversation_summaries.db-wal") || p.hasSuffix("transcript.jsonl") {
                        engine.historyChanged()
                    }
                } else if p.hasSuffix(".jsonl") {
                    if engine.cursors[p] == nil { engine.historyChanged() }
                    engine.pump(p)
                } else if p.hasPrefix(engine.registry) {
                    engine.registryChanged()
                } else if p.hasPrefix(CodexHooks.dir + "/") {
                    engine.codexWaitChanged()
                }
            }
        }
        let flags = UInt32(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes | kFSEventStreamCreateFlagNoDefer)
        // Also watch ~/.gemini/antigravity-cli so conversation_summaries.db and step changes arrive immediately.
        var watched: [String] = [projects, registry]
        if FileManager.default.fileExists(atPath: Self.codexSessionsRoot) { watched.append(Self.codexSessionsRoot) }
        if FileManager.default.fileExists(atPath: agyRoot) { watched.append(agyRoot) }
        // And Codex's approval requests (CodexHooks), the moment its hook writes or drops one, and its own log, where the
        // user's answer to one lands.
        if FileManager.default.fileExists(atPath: CodexHooks.dir) { watched.append(CodexHooks.dir) }
        if FileManager.default.fileExists(atPath: HOME + "/.codex") { watched.append(HOME + "/.codex") }
        guard let s = FSEventStreamCreate(nil, callback, &ctx, watched as CFArray,
                                          FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 0.2, flags) else { return }
        FSEventStreamSetDispatchQueue(s, queue)
        FSEventStreamStart(s)
        stream = s
    }

    private func maybeNewDay() {
        let d = dayStart()
        guard d != day0 else { return }
        // The day that ended stays in the spend panel's history as counted, until its transcripts are read.
        ledger.holdProvisional(G.byProject, at: day0)
        day0 = d
        G = Globals()
        scheduleLedger()
        seenMsg.removeAll()
        recOwner.removeAll()
        for S in sessions.values { S.resetCounters() }
        for A in agents.values { A.resetCounters() }
        otherSeen.removeAll()
        otherCalls.removeAll()
        otherChatsToday.removeAll()
        otherAgentsToday.removeAll()
        for O in others.values { O.resetCounters() }
    }

    // MARK: spend ledger

    /// Reads the ledger's days soon: ten minutes into the day, so the last replies of the day before are on disk.
    private func scheduleLedger() {
        let wait = max(0, (day0 + 10 * Self.MIN - nowMs()) / 1000) + 1
        queue.asyncAfter(deadline: .now() + wait) { self.readLedger() }
    }

    /// The days before today the ledger doesn't have yet, read from the transcripts at background priority (the first time
    /// all of them, a few seconds' work), then frozen.
    private func readLedger() {
        guard nowMs() - day0 >= 10 * Self.MIN, let span = ledger.beginReading(before: day0) else { return }
        let projects = self.projects
        DispatchQueue.global(qos: .background).async {
            let t0 = Date()
            let days = Ledger.scan(projects: projects, from: span.from, to: span.to)
            self.queue.async {
                self.ledger.freeze(days, through: span.to)
                NSLog("atalay-terminal: spend ledger read %d days in %.1fs", days.count, Date().timeIntervalSince(t0))
            }
        }
    }

    /// For the dashboard's spend panel (SpendBridge): the last 7 or 30 days, 12 weeks or 12 months by project, today live.
    /// Called back on the main thread.
    func spendHistory(_ range: String, completion: @escaping ([String: Any]) -> Void) {
        queue.async {
            let out = self.ledger.summary(range: range, day0: self.day0, today: self.G.byProject)
            DispatchQueue.main.async { completion(out) }
        }
    }

    // MARK: lookup helpers

    private func session(_ sid: String) -> Session {
        if let S = sessions[sid] { return S }
        let S = Session(id: sid)
        sessions[sid] = S
        return S
    }

    private func agent(_ sid: String, _ aid: String) -> SubAgent {
        let key = "\(sid):\(aid)"
        if let A = agents[key] { return A }
        let A = SubAgent(sid: sid, id: aid)
        agents[key] = A
        return A
    }

    private func minute(_ ts: Double) -> Minute {
        let k = Int(ts / Self.MIN)
        if let m = G.minutes[k] { return m }
        let m = Minute()
        G.minutes[k] = m
        return m
    }

    private func ev(_ k: String, _ ts: Double, _ S: Session, _ A: SubAgent?, _ extra: [String: Any] = [:]) -> [String: Any] {
        ev(k, ts, sid: S.id, aid: A?.id, extra)
    }

    private func ev(_ k: String, _ ts: Double, sid: String, aid: String?, _ extra: [String: Any] = [:]) -> [String: Any] {
        var e = extra
        e["k"] = k
        e["t"] = ts
        e["s"] = sid
        if let aid { e["a"] = aid }
        return e
    }

    private static let logged: Set<String> = ["tool", "prompt", "say", "sys"]

    private func emit(_ e: [String: Any], _ today: Bool) {
        guard today else { return }
        let k = e["k"] as? String ?? ""
        if k == "result" {
            if let id = e["id"] as? String, let entry = logIndex[id] {
                entry.dict["ok"] = e["ok"]
                if let d = e["d"] { entry.dict["d"] = d }
                entry.dict["m"] = e["m"]
            }
        } else if Self.logged.contains(k) {
            let entry = LogEntry(e)
            log.append(entry)
            if k == "tool", let id = e["id"] as? String { logIndex[id] = entry }
            if booted, log.count > 240 {
                let x = log.removeFirst()
                if let id = x.dict["id"] as? String { logIndex.removeValue(forKey: id) }
            }
        }
        guard booted else { return }
        outbox.append(e)
        stateDirty = true
        if !flushPending {
            flushPending = true
            queue.asyncAfter(deadline: .now() + 0.12) {
                self.flushPending = false
                self.flushEvents()
            }
        }
    }

    private func ringPush(_ arr: inout [[String: Any]], _ item: [String: Any], _ n: Int) {
        arr.append(item)
        if booted, arr.count > n { arr.removeFirst() }
    }

    // Rings fill out of order while boot reads file after file, so they are trimmed by time once at the end.
    private func settleRings() {
        log.sort { $0.t < $1.t }
        if log.count > 240 { log.removeFirst(log.count - 240) }
        logIndex.removeAll()
        for e in log { if let id = e.dict["id"] as? String { logIndex[id] = e } }
        let byT: ([String: Any], [String: Any]) -> Bool = { ($0["t"] as? Double ?? 0) < ($1["t"] as? Double ?? 0) }
        G.research = Array(G.research.sorted(by: byT).suffix(60))
        G.shells = Array(G.shells.sorted(by: byT).suffix(40))
        G.ticker = Array(G.ticker.sorted(by: byT).suffix(200))
    }

    // MARK: transcript ingestion

    private func ingest(_ rec: [String: Any], _ f: Cursor) {
        guard let sid = (rec["sessionId"] as? String) ?? f.sid else { return }
        if let uuid = rec["uuid"] as? String {
            if let owner = recOwner[uuid] {
                // Already seen in another session: Claude Code starts a new session id when a compacted or still
                // open conversation is resumed, and repeats its records there. The older one is the same chat.
                if owner != sid, f.agentId == nil, let O = sessions[owner], O.supersededBy == nil {
                    O.supersededBy = sid
                    stateDirty = true
                }
                return
            }
            recOwner[uuid] = sid
        }
        let ts = parseISO(rec["timestamp"] as? String)
        let S = session(sid)
        let aid = f.agentId ?? ((rec["isSidechain"] as? Bool) == true ? rec["agentId"] as? String : nil)
        let A = aid.map { agent(sid, $0) }
        let today = ts >= day0
        if ts > 0 {
            S.lastTs = max(S.lastTs, ts)
            if S.firstTs == 0 || ts < S.firstTs { S.firstTs = ts }
            if let A {
                A.lastTs = max(A.lastTs, ts)
                if A.firstTs == 0 || ts < A.firstTs { A.firstTs = ts }
            }
        }
        if S.cwd.isEmpty, let cwd = rec["cwd"] as? String { S.cwd = cwd }
        if A == nil, let b = rec["gitBranch"] as? String, b != "HEAD" { S.branch = b }

        switch rec["type"] as? String {
        case "ai-title":
            if let t = rec["aiTitle"] as? String { S.title = clip(redact(t), 90) }
        case "last-prompt":
            if A == nil, let p = rec["lastPrompt"] as? String { S.lastPrompt = clip(redact(p), 220) }
        case "assistant": onAssistant(rec, S, A, ts, today)
        case "user": onUser(rec, S, A, ts, today)
        case "system": onSystem(rec, S, A, ts, today)
        default: break
        }
    }

    private func onAssistant(_ rec: [String: Any], _ S: Session, _ A: SubAgent?, _ ts: Double, _ today: Bool) {
        let actor: Track = A ?? S
        let m = rec["message"] as? [String: Any] ?? [:]
        let model = m["model"] as? String
        let content = m["content"] as? [[String: Any]] ?? []
        if (rec["isApiErrorMessage"] as? Bool) == true || model == "<synthetic>" {
            let txt = clip(redact(content.compactMap { $0["text"] as? String }.joined(separator: " ")), 100)
            emit(ev("sys", ts, S, A, ["l": txt.isEmpty ? "API error" : txt, "err": true]), today)
            return
        }
        if let model {
            actor.model = model
            if A == nil { S.model = model }
        }
        if A == nil, let e = rec["effort"] as? String { S.effort = e }

        if let u = m["usage"] as? [String: Any], let mid = m["id"] as? String, !seenMsg.contains(mid) {
            seenMsg.insert(mid)
            let i = int(u["input_tokens"]), o = int(u["output_tokens"])
            let r = int(u["cache_read_input_tokens"]), w = int(u["cache_creation_input_tokens"])
            if A == nil {
                S.ctx = i + r + w
                S.ctxMax = contextLimit(model, cwd: S.cwd)
            }
            if today {
                let c = costOf(model, u)
                S.addTok(i, o, r, w)
                S.cost += c
                if let A {
                    A.addTok(i, o, r, w)
                    A.cost += c
                }
                G.tokIn += i; G.tokOut += o; G.tokCr += r; G.tokCw += w
                G.cost += c
                G.saved += savedOf(model, u)
                let mk = shortModel(model).isEmpty ? "?" : shortModel(model)
                let bm = G.byModel[mk] ?? ModelAgg(model: mk, priced: priceFor(model) != nil)
                bm.tokIn += i; bm.tokOut += o; bm.tokCr += r; bm.tokCw += w
                bm.cost += c
                bm.calls += 1
                G.byModel[mk] = bm
                // A subagent's spend is its chat's project's.
                G.byProject[S.cwd, default: [:]][mk, default: Ledger.Agg()].add(cost: c, i, o, r, w)
                let mb = minute(ts)
                mb.tok += i + o + r + w
                mb.cost += c
                emit(ev("usage", ts, S, A, ["out": o, "cr": r, "cw": w, "in": i, "c": c, "m": mk]), today)
            }
        }
        if let stop = m["stop_reason"] as? String { actor.endTurn = stop == "end_turn" }
        for b in content {
            switch b["type"] as? String {
            case "tool_use": onToolUse(b, S, A, ts, today)
            case "text":
                if let t = b["text"] as? String, !t.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    emit(ev("say", ts, S, A, ["l": clip(redact(t), 160)]), today)
                }
            case "thinking": emit(ev("think", ts, S, A), today)
            default: break
            }
        }
    }

    private func onToolUse(_ b: [String: Any], _ S: Session, _ A: SubAgent?, _ ts: Double, _ today: Bool) {
        let actor: Track = A ?? S
        let name = b["name"] as? String ?? "?"
        let id = b["id"] as? String ?? UUID().uuidString
        let c = catOf(name)
        let sm = summarize(name, b["input"])
        let p = Pending(n: name, c: c, l: sm.label, t: ts)
        actor.pendingSet(id, p)
        actor.last = p
        actor.sig.append("\(name)|\(sm.label)")
        if actor.sig.count > 4 { actor.sig.removeFirst() }
        guard today else { return }

        for x in ([S, A] as [Track?]).compactMap({ $0 }) {
            x.tools += 1
            x.byCat[c, default: 0] += 1
            if c == "web" { x.web += 1 }
        }
        S.spark[Int(ts / 20_000), default: 0] += 1
        G.tools += 1
        G.byCat[c, default: 0] += 1
        if ts >= (G.lastByCat[c]?["t"] as? Double ?? 0) { G.lastByCat[c] = ["l": sm.label, "t": ts, "s": S.id] }
        let mb = minute(ts)
        mb.tools += 1
        mb.cats[c, default: 0] += 1
        ringPush(&G.ticker, ["id": id, "t": ts, "c": c, "st": "run", "n": name], 200)
        if c == "web" {
            G.web += 1
            var r: [String: Any] = ["id": id, "t": ts, "s": S.id, "kind": name == "WebSearch" ? "search" : "fetch",
                                    "l": sm.label, "m": "", "ok": NSNull(), "d": NSNull(), "hosts": [String]()]
            if let A { r["a"] = A.id }
            ringPush(&G.research, r, 60)
        }
        if name == "Bash" {
            var r: [String: Any] = ["id": id, "t": ts, "s": S.id, "l": sm.label, "cmd": sm.cmd ?? "", "ok": NSNull(), "d": NSNull()]
            if let A { r["a"] = A.id }
            ringPush(&G.shells, r, 40)
        }
        if let file = sm.file { touchFile(file, name, sid: S.id, aid: A?.id, ts) }
        if name == "Agent" || name == "Task", let input = b["input"] as? [String: Any] {
            agentHints[id] = (clip(input["description"] as? String, 70), input["subagent_type"] as? String ?? "")
        }
        emit(ev("tool", ts, S, A, ["id": id, "n": name, "c": c, "l": sm.label]), today)
    }

    private func touchFile(_ fp: String, _ name: String, sid: String, aid: String?, _ ts: Double) {
        let F = G.files[fp] ?? FileHeat(p: fp)
        G.files[fp] = F
        if name == "Read" || name == "NotebookRead" {
            F.r += 1
        } else {
            F.w += 1
            F.editors[aid.map { "\(sid):\($0)" } ?? sid] = (ts, sid, aid)
        }
        F.last = ts
    }

    private func onUser(_ rec: [String: Any], _ S: Session, _ A: SubAgent?, _ ts: Double, _ today: Bool) {
        let content = (rec["message"] as? [String: Any])?["content"]
        if let text = content as? String {
            if A == nil { onPrompt(text, rec, S, ts, today) }
            return
        }
        guard let blocks = content as? [[String: Any]] else { return }
        var hasResult = false
        var texts: [String] = []
        for b in blocks {
            if b["type"] as? String == "tool_result" {
                hasResult = true
                onToolResult(b, rec, S, A, ts, today)
            } else if b["type"] as? String == "text", let t = b["text"] as? String {
                texts.append(t)
            }
        }
        if !hasResult, !texts.isEmpty, A == nil { onPrompt(texts.joined(separator: " "), rec, S, ts, today) }
    }

    private func onPrompt(_ text: String, _ rec: [String: Any], _ S: Session, _ ts: Double, _ today: Bool) {
        if (rec["isMeta"] as? Bool) == true { return }
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return }
        if t.hasPrefix("[Request interrupted") {
            emit(ev("sys", ts, S, nil, ["l": "interrupted by user", "err": true]), today)
            return
        }
        if t.hasPrefix("<task-notification") {
            emit(ev("sys", ts, S, nil, ["l": "background task reported back"]), today)
            return
        }
        if t.hasPrefix("<") || t.hasPrefix("Caveat:") {
            if let r = t.range(of: #"<command-name>([^<]+)</command-name>"#, options: .regularExpression) {
                let cmd = t[r].replacingOccurrences(of: "<command-name>", with: "").replacingOccurrences(of: "</command-name>", with: "")
                emit(ev("prompt", ts, S, nil, ["l": cmd.trimmingCharacters(in: .whitespaces), "cmd": true]), today)
            }
            return
        }
        S.endTurn = false
        if today {
            S.prompts += 1
            G.prompts += 1
        }
        emit(ev("prompt", ts, S, nil, ["l": clip(redact(t), 180)]), today)
    }

    private func onToolResult(_ b: [String: Any], _ rec: [String: Any], _ S: Session, _ A: SubAgent?, _ ts: Double, _ today: Bool) {
        let actor: Track = A ?? S
        guard let id = b["tool_use_id"] as? String else { return }
        let p = actor.pendingGet(id) ?? S.pendingGet(id)
        actor.pendingRemove(id)
        S.pendingRemove(id)
        let ok = (b["is_error"] as? Bool) != true
        let d: Double? = p.map { ts > 0 ? max(0, ts - $0.t) : 0 }
        var meta = ""
        var hosts: [String] = []
        if let tr = rec["toolUseResult"] as? [String: Any] {
            if tr["url"] != nil, let code = tr["code"] {
                let bytes = int(tr["bytes"])
                meta = "\(code)\(bytes > 0 ? " · " + fmtBytes(bytes) : "")"
            } else if tr["query"] != nil, let results = tr["results"] as? [Any] {
                let links = results.compactMap { ($0 as? [String: Any])?["content"] as? [[String: Any]] }.flatMap { $0 }
                var seen = Set<String>()
                for l in links {
                    let h = hostOf(l["url"] as? String)
                    if !h.isEmpty, seen.insert(h).inserted { hosts.append(h) }
                    if hosts.count == 4 { break }
                }
                meta = "\(links.count) results"
            } else if let agentId = tr["agentId"] as? String {
                meta = tr["status"] as? String ?? ""
                let sub = agent(S.id, agentId)
                let hint = agentHints[id]
                if sub.desc.isEmpty { sub.desc = clip((tr["description"] as? String) ?? hint?.desc, 70) }
                if sub.type.isEmpty, let ty = hint?.type { sub.type = ty }
                if sub.model.isEmpty, let rm = tr["resolvedModel"] as? String { sub.model = rm }
            } else if (tr["interrupted"] as? Bool) == true {
                meta = "interrupted"
            }
        }
        guard today else { return }
        if !ok {
            actor.errors += 1
            if A != nil { S.errors += 1 }
            G.errors += 1
        }
        if let i = G.ticker.lastIndex(where: { $0["id"] as? String == id }) { G.ticker[i]["st"] = ok ? "ok" : "err" }
        if let i = G.research.lastIndex(where: { $0["id"] as? String == id }) {
            G.research[i]["ok"] = ok
            G.research[i]["d"] = orNull(d)
            G.research[i]["m"] = meta
            G.research[i]["hosts"] = hosts
        }
        if let i = G.shells.lastIndex(where: { $0["id"] as? String == id }) {
            G.shells[i]["ok"] = ok
            G.shells[i]["d"] = orNull(d)
        }
        var extra: [String: Any] = ["id": id, "ok": ok, "m": meta]
        if let p {
            extra["n"] = p.n
            extra["c"] = p.c
        }
        if let d { extra["d"] = d }
        emit(ev("result", ts, S, A, extra), today)
    }

    private func onSystem(_ rec: [String: Any], _ S: Session, _ A: SubAgent?, _ ts: Double, _ today: Bool) {
        let subtype = rec["subtype"] as? String
        if subtype == "turn_duration", let ms = (rec["durationMs"] as? NSNumber)?.doubleValue {
            if A == nil { S.turnMs = ms }
            if today {
                G.turns += 1
                G.turnMs += ms
            }
            emit(ev("turn", ts, S, nil, ["d": ms]), today)
        } else if subtype == "compact_boundary" {
            emit(ev("sys", ts, S, nil, ["l": "context compacted"]), today)
        } else if rec["level"] as? String == "error" || subtype == "api_error" {
            emit(ev("sys", ts, S, nil, ["l": clip(redact((rec["content"] as? String) ?? subtype), 100), "err": true]), today)
        }
    }

    // MARK: transcript files

    private func newCursor(_ fp: String) -> Cursor {
        let c = Cursor(path: fp)
        let rel = fp.hasPrefix(projects + "/") ? String(fp.dropFirst(projects.count + 1)).split(separator: "/").map(String.init) : []
        if rel.count == 2 {
            c.sid = (rel[1] as NSString).deletingPathExtension
        } else if rel.count >= 3 {
            c.sid = rel[1]
            var base = (rel[rel.count - 1] as NSString).deletingPathExtension
            if base.hasPrefix("agent-") { base.removeFirst(6) }
            c.agentId = base
            loadAgentMeta(fp, c)
        }
        return c
    }

    private func loadAgentMeta(_ fp: String, _ c: Cursor) {
        guard let sid = c.sid, let aid = c.agentId else { return }
        let metaPath = (fp as NSString).deletingPathExtension + ".meta.json"
        guard let data = FileManager.default.contents(atPath: metaPath),
              let meta = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
        let A = agent(sid, aid)
        if let d = meta["description"] as? String { A.desc = clip(d, 70) }
        if let t = meta["agentType"] as? String { A.type = t }
        if let m = meta["model"] as? String, m != "inherit" { A.model = m }
        A.bg = meta["requestShape"] as? String == "background"
    }

    private func fileStat(_ path: String) -> (size: UInt64, mtime: Double)? { Self.fileStat(path) }

    private static func fileStat(_ path: String) -> (size: UInt64, mtime: Double)? {
        var st = stat()
        guard stat(path, &st) == 0 else { return nil }
        return (UInt64(st.st_size), Double(st.st_mtimespec.tv_sec) * 1000 + Double(st.st_mtimespec.tv_nsec) / 1e6)
    }

    /// Binary search for the byte offset where records reach `since`, so huge transcripts load fast.
    static func seekTime(_ path: String, _ size: UInt64, _ since: Double) -> UInt64 {
        guard let fh = FileHandle(forReadingAtPath: path) else { return 0 }
        defer { try? fh.close() }
        func probe(_ pos: UInt64) -> Double? {
            try? fh.seek(toOffset: pos)
            guard let data = try? fh.read(upToCount: Int(min(UInt64(2 << 20), size - pos))),
                  let nl = data.firstIndex(of: 10) else { return nil }
            let rest = data[(nl + 1)...]
            let s = String(decoding: rest.prefix(256 << 10), as: UTF8.self)
            guard let r = s.range(of: #""timestamp":"\d{4}-\d\d-\d\dT[^"]+""#, options: .regularExpression) else { return nil }
            return parseISO(String(s[r].dropFirst(13).dropLast()))
        }
        var lo: UInt64 = 0, hi = size
        var i = 0
        while i < 32, hi - lo > 1 << 20 {
            let mid = (lo + hi) / 2
            if let t = probe(mid), t < since { lo = mid } else { hi = mid }
            i += 1
        }
        return lo
    }

    private static let skipTypes: [Data] = ["attachment", "file-history-snapshot", "progress", "queue-operation", "permission-mode", "atis-latch"]
        .map { Data("\"type\":\"\($0)\"".utf8) }

    private static let dataKey = Array("\"data\":\"".utf8)

    /// Screenshots sit in transcripts as base64 (86% of a busy day's bytes) and nothing here reads them, so
    /// long `"data":"…"` strings are dropped before parsing instead of being decoded into Swift strings.
    static func withoutImages(_ line: Data) -> Data {
        guard line.count > 32 << 10 else { return line }
        var out = Data()
        out.reserveCapacity(16 << 10)
        line.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            guard let base = raw.baseAddress else { return }
            let n = raw.count
            var i = 0
            while i < n {
                guard let hit = memmem(base + i, n - i, dataKey, dataKey.count) else {
                    out.append(base.assumingMemoryBound(to: UInt8.self) + i, count: n - i)
                    break
                }
                let open = base.distance(to: UnsafeRawPointer(hit)) + dataKey.count
                out.append(base.assumingMemoryBound(to: UInt8.self) + i, count: open - i)
                let close = memchr(base + open, 0x22, n - open).map { base.distance(to: UnsafeRawPointer($0)) } ?? n
                if close - open <= 1024 { out.append(base.assumingMemoryBound(to: UInt8.self) + open, count: close - open) }
                i = close
            }
        }
        return out
    }

    private func pump(_ fp: String) {
        let c = cursors[fp] ?? newCursor(fp)
        cursors[fp] = c
        guard let st = fileStat(fp) else { return }
        if st.size < c.off {
            c.off = 0
            c.rest = Data()
        }
        if !c.started {
            c.started = true
            if st.size > Self.bigFile {
                c.off = Self.seekTime(fp, st.size, day0 - 10 * Self.MIN)
                c.skipLine = c.off > 0
            }
        }
        guard st.size > c.off, let fh = FileHandle(forReadingAtPath: fp) else { return }
        defer { try? fh.close() }
        try? fh.seek(toOffset: c.off)
        var pos = c.off
        while pos < st.size {
            let want = Int(min(UInt64(Self.chunk), st.size - pos))
            guard let chunk = try? fh.read(upToCount: want), !chunk.isEmpty else { break }
            pos += UInt64(chunk.count)
            var data = c.rest.isEmpty ? chunk : c.rest + chunk
            c.rest = Data()
            if c.skipLine {
                guard let nl = data.firstIndex(of: 10) else { continue }
                data = data[(nl + 1)...]
                c.skipLine = false
            }
            guard let lastNL = data.lastIndex(of: 10) else {
                c.rest = Data(data)
                continue
            }
            c.rest = Data(data[(lastNL + 1)...])
            // Lines are found with memchr on the raw bytes (the generic Collection search walked Data
            // element by element) and handed to the JSON parser without copying.
            data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
                guard let base = raw.baseAddress else { return }
                let end = lastNL - data.startIndex
                var off = 0
                while off < end {
                    let nl = memchr(base + off, 10, end - off).map { base.distance(to: UnsafeRawPointer($0)) } ?? end
                    if nl > off {
                        let line = Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: base + off), count: nl - off, deallocator: .none)
                        let head = line.prefix(600)
                        if !Self.skipTypes.contains(where: { head.range(of: $0) != nil }),
                           let rec = try? JSONSerialization.jsonObject(with: Self.withoutImages(line)) as? [String: Any] {
                            ingest(rec, c)
                        }
                    }
                    off = nl + 1
                }
            }
        }
        c.off = pos
    }

    private func collectFiles(since: Double) -> [String] {
        var out: [String] = []
        func walk(_ dir: String, _ depth: Int) {
            guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { return }
            for n in names {
                let p = (dir as NSString).appendingPathComponent(n)
                if n.hasSuffix(".jsonl") {
                    if let st = fileStat(p), st.mtime >= since { out.append(p) }
                } else if depth < 6, n != "memory", !n.contains(".") {
                    var isDir: ObjCBool = false
                    if FileManager.default.fileExists(atPath: p, isDirectory: &isDir), isDir.boolValue { walk(p, depth + 1) }
                }
            }
        }
        walk(projects, 0)
        return out
    }

    func transcriptFor(_ cwd: String, _ sid: String) -> String {
        let enc = String(cwd.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) && $0.isASCII ? Character($0) : "-" })
        return "\(projects)/\(enc)/\(sid).jsonl"
    }

    // MARK: live registry + processes

    private func alive(_ pid: Int32) -> Bool {
        kill(pid, 0) == 0 || errno == EPERM
    }

    private func pollRegistry() {
        let names = (try? FileManager.default.contentsOfDirectory(atPath: registry)) ?? []
        var seen = Set<String>()
        var present = Set<String>()
        for n in names where n.hasSuffix(".json") && n.dropLast(5).allSatisfy(\.isNumber) {
            present.insert(n)
            let path = (registry as NSString).appendingPathComponent(n)
            guard let st = fileStat(path) else { continue }
            if let c = regCache[n], c.mtime == st.mtime {
                guard c.chat, alive(c.pid) else { continue }
                seen.insert(c.sid)
                let owner = sessions[c.sid]?.pid
                if owner == c.pid || owner.map(alive) == true {
                    if let S = sessions[c.sid], S.reg == "idle" || S.reg == "shell", !S.pending.isEmpty {
                        S.pending.removeAll()
                        stateDirty = true
                    }
                    continue
                }
                // The process that carried this chat is gone; this one holds the same conversation: read it again.
            }
            guard let data = FileManager.default.contents(atPath: path),
                  let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let sid = j["sessionId"] as? String, let pidNum = j["pid"] as? NSNumber else { continue }
            let pid = pidNum.int32Value
            // Only the user's chats: Claude Code also registers background jobs and daemons (`kind`), pre-started
            // spare processes and sessions hosted inside another session.
            let chat = (j["kind"] as? String ?? "interactive") == "interactive" && j["spare"] as? Bool != true
                && (j["hostSessionId"] as? String ?? "").isEmpty
            // Same process, new session id: Claude moved this chat on (e.g. after compacting), not a new chat.
            if let old = regCache[n], old.pid == pid, old.sid != sid, chat {
                sessions[old.sid]?.supersededBy = sid
            }
            regCache[n] = (st.mtime, sid, pid, chat)
            guard chat, alive(pid) else { continue }
            seen.insert(sid)
            let S = session(sid)
            // A second live process on this conversation that was updated earlier doesn't take the card over.
            let updated = (j["updatedAt"] as? NSNumber)?.doubleValue ?? 0
            if S.live, let cur = S.pid, cur != pid, alive(cur), S.regUpdated > updated { continue }
            S.regUpdated = updated
            stateDirty = true
            S.live = true
            S.pid = pid
            if let name = j["name"] as? String { S.name = name }
            S.reg = j["status"] as? String ?? "busy"
            S.waitingFor = j["waitingFor"] as? String
            S.statusSince = (j["statusUpdatedAt"] as? NSNumber)?.doubleValue ?? (j["updatedAt"] as? NSNumber)?.doubleValue ?? S.statusSince
            S.kind = j["kind"] as? String ?? ""
            S.entry = j["entrypoint"] as? String ?? ""
            if S.cwd.isEmpty, let cwd = j["cwd"] as? String { S.cwd = cwd }
            if S.firstTs == 0 { S.firstTs = (j["startedAt"] as? NSNumber)?.doubleValue ?? 0 }
            if S.reg == "idle" || S.reg == "shell" { S.pending.removeAll() }
            let fp = transcriptFor(S.cwd, sid)
            if cursors[fp] == nil, FileManager.default.fileExists(atPath: fp) { pump(fp) }
        }
        for n in regCache.keys where !present.contains(n) { regCache.removeValue(forKey: n) }
        for S in sessions.values where S.live && !seen.contains(S.id) {
            S.live = false
            S.reg = nil
            S.ppid = nil
            S.hostTab = nil
            S.endedAt = nowMs()
            stateDirty = true
        }
    }

    private func pollProcesses() {
        let now = ProcessInfo.processInfo.systemUptime
        var alivePids = Set<Int32>()
        for S in sessions.values where S.live {
            guard let pid = S.pid, let info = Proc.info(pid) else { continue }
            alivePids.insert(pid)
            if S.ppid != info.ppid || S.tty != info.tty { stateDirty = true }
            S.ppid = info.ppid
            S.tty = info.tty
            if let prev = cpuSeen[pid], now > prev.at, info.cpuTime >= prev.ns {
                S.cpu = Double(info.cpuTime - prev.ns) / ((now - prev.at) * 1e9) * 100
            }
            cpuSeen[pid] = (info.cpuTime, now)
            S.mem = Int(info.rss / 1_048_576)
            // /autocompact changed the window mid-session: the gauge follows within seconds, not at Claude's next reply.
            if !S.model.isEmpty {
                let limit = contextLimit(S.model, cwd: S.cwd)
                if limit != S.ctxMax {
                    S.ctxMax = limit
                    stateDirty = true
                }
            }
        }
        cpuSeen = cpuSeen.filter { alivePids.contains($0.key) }
        pollOthers()
        matchTabs()
    }

    /// The other AI tools running in terminals (Proc.otherAIs), each a session: busy while it, or anything it runs, works
    /// the CPU (its screen redrawing as it streams, its tools; Codex's npm launcher only waits while its own binary works),
    /// idle once it has been quiet for 10 seconds; one that quits shows as ended for two minutes, so its window turns back
    /// into a terminal.
    private func pollOthers() {
        let me = getuid(), now = ProcessInfo.processInfo.systemUptime, ms = nowMs()
        if codexRunning { refreshCodexWaits() } else { codexWaits = [:] }
        var found: [Int32: (tool: String, info: Proc.Info)] = [:]
        for pid in Proc.all() {
            guard let tool = Proc.otherAI(pid), let info = Proc.info(pid), info.uid == me, info.tty != nil else { continue }
            found[pid] = (tool, info)
        }
        var seen = Set<String>(), measured = Set<Int32>()
        // A launcher's child is the same session (Codex's Node script starts Codex's own binary).
        for (pid, f) in found.sorted(by: { $0.value.info.started < $1.value.info.started }) where found[f.info.ppid] == nil {
            let id = "ai:\(pid):\(f.info.started)"
            seen.insert(id)
            let O: OtherAI
            if let known = others[id] {
                O = known
            } else {
                O = OtherAI(id: id, tool: f.tool, pid: pid)
                if f.tool == "Antigravity" { O.turnOpen = false }
                O.firstTs = Double(f.info.started) / 1000
                O.lastTs = ms
                O.statusSince = ms
                others[id] = O
                stateDirty = true
            }
            // Its CPU and its descendants', each since the last look (one that started since counts from the next).
            var used = 0.0, level = [pid]
            for _ in 0..<5 where !level.isEmpty {
                for p in level {
                    guard let info = p == pid ? f.info : Proc.info(p) else { continue }
                    if let prev = otherCpu[p], now > prev.at, info.cpuTime >= prev.ns {
                        used += Double(info.cpuTime - prev.ns) / ((now - prev.at) * 1e9) * 100
                    }
                    otherCpu[p] = (info.cpuTime, now)
                    measured.insert(p)
                }
                level = level.flatMap { Proc.children(of: $0) }
            }
            O.cpu = used
            O.mem = Int(f.info.rss / 1_048_576)
            if O.cpu >= 1 { O.busyUntil = ms + 10_000 }
            let busy = ms < O.busyUntil
            if busy { O.lastTs = ms }
            let cwd = Proc.cwd(pid) ?? O.cwd
            let running = Self.runningCommand(under: pid), command = running?.line
            if command != O.command {
                O.command = command
                O.commandSince = ms
                stateDirty = true
            }
            O.commandStarted = running?.started ?? 0
            if O.tool == "Codex", !cwd.isEmpty { readCodexLog(O, cwd: cwd, since: Double(f.info.started) / 1_000_000, now: ms) }
            if O.tool == "Antigravity", !cwd.isEmpty { readAntigravity(O, cwd: cwd) }
            if busy != O.busy || cwd != O.cwd || O.tty != f.info.tty || O.ppid != f.info.ppid {
                O.busy = busy
                O.cwd = cwd
                O.tty = f.info.tty
                O.ppid = f.info.ppid
                stateDirty = true
            }
            // Since when it shows what it shows (your.call's clock), its records' turn included, not only its CPU.
            let shown = otherStatus(O, ms).status
            if shown != O.shown {
                O.shown = shown
                O.statusSince = ms
                stateDirty = true
            }
        }
        for O in others.values where O.endedAt == 0 && !seen.contains(O.id) {
            O.endedAt = ms
            O.busy = false
            stateDirty = true
        }
        // A Codex or an Antigravity just started has its limits at once, not at the next minute's read.
        if codexRunning, !codexWasRunning { refreshCodexUsage() }
        codexWasRunning = codexRunning
        if let model = others.values.filter({ $0.tool == "Antigravity" && !$0.model.isEmpty }).max(by: { $0.lastTs < $1.lastTs })?.model,
           model != agyModel {
            agyModel = model
            stateDirty = true
        }
        if agyRunning, !agyWasRunning { refreshAgyUsage() }
        agyWasRunning = agyRunning
        let before = others.count
        others = others.filter { $0.value.endedAt == 0 || ms - $0.value.endedAt < 120_000 }
        agyConfirms = agyConfirms.filter { others[$0.key] != nil }
        agyTurns = agyTurns.filter { others[$0.key] != nil }
        if others.count != before { stateDirty = true }
        otherCpu = otherCpu.filter { measured.contains($0.key) }
    }

    private static let shellNames: Set<String> = ["sh", "bash", "zsh", "fish", "dash"]

    /// The command a tool has a shell run right now (`zsh -lc "npm test"`), from its child processes, and when that shell started.
    private static func runningCommand(under pid: Int32) -> (line: String, started: Double)? {
        var level = Proc.children(of: pid), found: (line: String, started: Double)?
        for _ in 0..<3 where !level.isEmpty {
            for p in level {
                guard let name = Proc.name(p), shellNames.contains(name), let args = Proc.arguments(p),
                      let i = args.firstIndex(where: { ["-c", "-lc", "-ic"].contains($0) }), i + 1 < args.count else { continue }
                found = (args[i + 1], Double(Proc.info(p)?.started ?? 0) / 1000)
            }
            level = level.flatMap { Proc.children(of: $0) }
        }
        return found.map { (clip($0.line.replacingOccurrences(of: "\n", with: " "), 120), $0.started) }
    }

    /// Its status: ended, or what its records say (over is the user's turn, unless its subagents still work, as Claude's
    /// background ones; a step waiting for the user's permission, its own or a subagent's, waits; without Antigravity's steps
    /// to tell, a tool call that runs nothing and burns nothing for a few seconds does), else busy while it works the CPU or
    /// runs a command.
    private func otherStatus(_ O: OtherAI, _ now: Double) -> (status: String, waiting: String?) {
        guard O.endedAt == 0 else { return ("ended", nil) }
        let command = otherCommand(O)
        guard let open = O.turnOpen else { return ((O.tool != "Antigravity" && O.busy) || command != nil ? "busy" : "idle", nil) }
        if O.waitsForUser || O.agentWaiting != nil {
            return ("waiting", "approval: " + ((O.waitsForUser ? O.call?.p : O.agentWaiting)?.l ?? "a step"))
        }
        // A recorded Codex turn is authoritative. UI redraws, MCP servers and leftover shells must not
        // restart a completed turn, nor does low CPU prove that an active tool needs approval.
        if O.tool == "Codex" {
            if open, let command = codexWait(O) { return ("waiting", "approval: " + command) }
            return (open ? "busy" : "idle", nil)
        }
        if !open { return ((O.tool != "Antigravity" && command != nil) || O.agents.contains { $0["running"] as? Bool == true } ? "busy" : "idle", nil) }
        if O.tool != "Antigravity", !O.stepsKnown, command == nil, !O.busy, let call = O.call, now - call.p.t > 4000 { return ("waiting", "approval: " + call.p.l) }
        return ("busy", nil)
    }

    /// What a Codex waits for the user to approve (CodexHooks): its session's request, until it's answered. Codex's own
    /// hooks drop it once the tool ran, the turn stopped or was interrupted, or a new prompt came; before those, a command
    /// it started after the request (allowed: a long one would keep the request on screen until it ends), a tool's output
    /// in its log after it (allowed and done, or denied), or a new turn answer it too.
    private func codexWait(_ O: OtherAI) -> String? {
        guard let log = O.log, let session = CodexHooks.session(ofLog: log), let wait = codexWaits[session] else { return nil }
        if O.commandStarted > wait.since || (codexOutputAt[O.id] ?? 0) > wait.since || O.turnStart > wait.since { return nil }
        return wait.command
    }

    /// The command it has a shell run, when that's work. Where its records tell its turns (Codex, Antigravity), a shell
    /// started before its last turn, or with none yet, is a server it keeps by it (an MCP server under `sh -c npx …`) and
    /// would show it working for good. A turn counts from a few seconds after the tool's start: one it resumed began
    /// earlier, and the servers it starts with would pass for that turn's commands.
    private func otherCommand(_ O: OtherAI) -> String? {
        guard let c = O.command else { return nil }
        if O.tool == "Antigravity" { return O.turnOpen == true && O.turnStart > 0 && O.commandStarted >= max(O.turnStart, O.firstTs + 5000) ? c : nil }
        guard O.tool == "Codex" else { return c }
        return O.turnOpen == true && O.turnStart > 0 && O.commandStarted >= max(O.turnStart, O.firstTs + 5000) ? c : nil
    }

    // MARK: the other AI tools' work, counted as Claude's is

    // Every panel Claude's calls fill (tool.mix, the ticker, research.feed, files.heat, session.log, the card's tools, web
    // and errors, the tokens) gets Codex's and Antigravity's too, from their own records: someone working only with one of
    // them saw them all empty. Each call, prompt or reply has a name of its own (`key`), so a record read again (another
    // conversation and back, the tool started again on the same one) counts nothing twice; only today's count, as Claude's.
    // `aid`: the subagent it's from, if any.

    /// Whether `key` is new to the day's counts (`all`) and to the session's (`mine`); either way it's counted from here.
    private func otherOnce(_ O: OtherAI, _ key: String) -> (all: Bool, mine: Bool) {
        (otherSeen.insert(key).inserted, O.counted.insert(key).inserted)
    }

    /// A tool call (`p` as agyTool and codexCall make it), on `files` if it reads or edits some.
    private func otherTool(_ O: OtherAI, _ key: String, _ p: Pending, files: [String] = [], aid: String? = nil) {
        let ts = p.t, c = p.c
        guard ts >= day0 else { return }
        if O.counted.insert(key).inserted {
            O.tools += 1
            O.byCat[c, default: 0] += 1
            if c == "web" { O.web += 1 }
            O.spark[Int(ts / 20_000), default: 0] += 1
            stateDirty = true
        }
        guard otherCalls[key] == nil else { return }
        otherCalls[key] = (p, false)
        G.tools += 1
        G.byCat[c, default: 0] += 1
        if ts >= (G.lastByCat[c]?["t"] as? Double ?? 0) { G.lastByCat[c] = ["l": p.l, "t": ts, "s": O.id] }
        let mb = minute(ts)
        mb.tools += 1
        mb.cats[c, default: 0] += 1
        ringPush(&G.ticker, ["id": key, "t": ts, "c": c, "st": "run", "n": p.n], 200)
        if c == "web" {
            G.web += 1
            var r: [String: Any] = ["id": key, "t": ts, "s": O.id, "kind": p.n == "WebSearch" ? "search" : "fetch",
                                    "l": p.l, "m": "", "ok": NSNull(), "d": NSNull(), "hosts": [String]()]
            if let aid { r["a"] = aid }
            ringPush(&G.research, r, 60)
        }
        if c == "bash" {
            var r: [String: Any] = ["id": key, "t": ts, "s": O.id, "l": p.l, "cmd": p.l, "ok": NSNull(), "d": NSNull()]
            if let aid { r["a"] = aid }
            ringPush(&G.shells, r, 40)
        }
        for f in files { touchFile(f, c == "read" ? "Read" : "Edit", sid: O.id, aid: aid, ts) }
        emit(ev("tool", ts, sid: O.id, aid: aid, ["id": key, "n": p.n, "c": c, "l": p.l]), true)
    }

    /// A call over: a failed one counts as an error; the ticker, research.feed, the shells and session.log get how it went.
    private func otherResult(_ O: OtherAI, _ key: String, ok: Bool, _ ts: Double, d: Double?, aid: String? = nil) {
        if O.counted.contains(key), O.resulted.insert(key).inserted, !ok {
            O.errors += 1
            stateDirty = true
        }
        guard let call = otherCalls[key], !call.done else { return }
        otherCalls[key]?.done = true
        if !ok { G.errors += 1 }
        if let i = G.ticker.lastIndex(where: { $0["id"] as? String == key }) { G.ticker[i]["st"] = ok ? "ok" : "err" }
        if let i = G.research.lastIndex(where: { $0["id"] as? String == key }) {
            G.research[i]["ok"] = ok
            G.research[i]["d"] = orNull(d)
        }
        if let i = G.shells.lastIndex(where: { $0["id"] as? String == key }) {
            G.shells[i]["ok"] = ok
            G.shells[i]["d"] = orNull(d)
        }
        var extra: [String: Any] = ["id": key, "ok": ok, "m": "", "n": call.p.n, "c": call.p.c]
        if let d { extra["d"] = d }
        emit(ev("result", ts, sid: O.id, aid: aid, extra), true)
    }

    /// A reply's tokens: the day's (the top bar, spend.ledger's line of the model, at no price: none is listed) and the card's.
    private func otherTokens(_ O: OtherAI, _ key: String, _ ts: Double, _ i: Int, _ o: Int, _ r: Int) {
        guard ts >= day0, i + o + r > 0 else { return }
        let (all, mine) = otherOnce(O, key)
        if mine { O.addTok(i, o, r, 0) }
        stateDirty = true
        guard all else { return }
        G.tokIn += i; G.tokOut += o; G.tokCr += r
        // Its own row in spend.ledger: keyed by the tool too, as another tool may name a model the same way.
        let mk = O.model.isEmpty ? O.tool : O.model
        let bm = G.byModel["\(O.tool)|\(mk)"] ?? ModelAgg(model: mk, priced: false, tool: O.tool)
        bm.tokIn += i; bm.tokOut += o; bm.tokCr += r
        bm.calls += 1
        G.byModel["\(O.tool)|\(mk)"] = bm
        minute(ts).tok += i + o + r
    }

    /// What the user asked, or what it answered, into session.log (a prompt counts as Claude's do).
    private func otherText(_ O: OtherAI, _ key: String, _ kind: String, _ text: String, _ ts: Double) {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard ts >= day0, !t.isEmpty else { return }
        let (all, mine) = otherOnce(O, key)
        if kind == "prompt", mine {
            O.prompts += 1
            stateDirty = true
        }
        guard all else { return }
        if kind == "prompt" { G.prompts += 1 }
        emit(ev(kind, ts, sid: O.id, aid: nil, ["l": clip(redact(t), kind == "prompt" ? 180 : 160)]), true)
    }

    /// Codex's own log (~/.codex/sessions/<date>/rollout-….jsonl): its turn open or over, the tool call it's on, the
    /// prompt, the context and the model. Matched to the process by its folder and start, looked for again every 30 s
    /// until found; read on from where it was.
    private func readCodexLog(_ O: OtherAI, cwd: String, since: Double, now: Double) {
        if O.log == nil, now - O.logChecked > 30_000 {
            O.logChecked = now
            let claimed = Set(others.values.compactMap { $0 !== O && $0.endedAt == 0 ? $0.log : nil })
            if let path = Self.codexLog(cwd: cwd, since: since, excluding: claimed) {
                O.log = path
                O.logOffset = 0
            }
        }
        guard let path = O.log, let st = fileStat(path), st.size > O.logOffset,
              let fh = FileHandle(forReadingAtPath: path) else { return }
        defer { try? fh.close() }
        // A long log: its last 2 MB tell enough.
        let from = max(O.logOffset, st.size > 2 << 20 ? st.size - (2 << 20) : 0)
        try? fh.seek(toOffset: from)
        let data = fh.readDataToEndOfFile()
        guard let lastBreak = data.lastIndex(of: 0x0A) else { return }
        O.logOffset = from + UInt64(lastBreak - data.startIndex + 1)
        for line in data[data.startIndex...lastBreak].split(separator: 0x0A) {
            guard let j = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any],
                  let p = j["payload"] as? [String: Any] else { continue }
            let ts = parseISO(j["timestamp"] as? String)
            // A line's own name for the day's counts: its log, and when in it. A turn's prompt and answers are named by
            // the turn and what they say: Codex writes each as an event, as an item, or (some versions) both.
            let at = "codex:\(path):\(j["timestamp"] as? String ?? "")", turn = "codex:\(path):turn\(O.turns)"
            switch (j["type"] as? String, p["type"] as? String) {
            case ("event_msg", "task_started"):
                O.turnOpen = true
                O.turnStart = ts
                O.call = nil
                O.turns += 1
            case ("event_msg", "task_complete"), ("event_msg", "turn_aborted"):
                O.turnOpen = false
                O.call = nil
            case ("event_msg", "item_completed"):
                let item = p["item"] as? [String: Any]
                guard let text = (item?["content"] as? [[String: Any]])?.compactMap({ $0["text"] as? String }).first else { break }
                if item?["type"] as? String == "UserMessage" {
                    O.prompt = clip(text, 200)
                    otherText(O, turn + ":in", "prompt", text, ts)
                } else if item?["type"] as? String == "AgentMessage" {
                    otherText(O, turn + ":say:\(text.hashValue)", "say", text, ts)
                }
            case ("event_msg", "user_message"):
                // Older Codex logs write the prompt this way.
                guard let text = p["message"] as? String, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { break }
                O.prompt = clip(text.trimmingCharacters(in: .whitespacesAndNewlines), 200)
                otherText(O, turn + ":in", "prompt", text, ts)
            case ("event_msg", "agent_message"):
                if let text = p["message"] as? String { otherText(O, turn + ":say:\(text.hashValue)", "say", text, ts) }
            case ("event_msg", "token_count"):
                let info = p["info"] as? [String: Any]
                if let last = info?["last_token_usage"] as? [String: Any] {
                    O.ctx = int(last["input_tokens"])
                    // Its input counts the cached part too: the rest is what was new.
                    let cached = int(last["cached_input_tokens"])
                    let total = info?["total_token_usage"] as? [String: Int]
                    if total == nil || total != O.codexTokenTotal {
                        otherTokens(O, at + ":tok", ts, max(0, int(last["input_tokens"]) - cached), int(last["output_tokens"]), cached)
                    }
                    O.codexTokenTotal = total
                }
                if let window = info?["model_context_window"] as? NSNumber { O.ctxMax = window.doubleValue }
            case ("event_msg", "thread_settings_applied"):
                if let m = (p["thread_settings"] as? [String: Any])?["model"] as? String { O.model = m }
            case ("turn_context", _):
                // Older Codex logs give the model with every turn instead.
                if let m = p["model"] as? String, !m.isEmpty { O.model = m }
            case ("response_item", let kind?) where kind.hasSuffix("_call_output"):
                let key = "codex:" + (p["call_id"] as? String ?? at)
                if O.call?.id == p["call_id"] as? String { O.call = nil }
                codexOutputAt[O.id] = max(codexOutputAt[O.id] ?? 0, ts)
                otherResult(O, key, ok: Self.codexOk(p["output"]), ts, d: otherCalls[key].map { max(0, ts - $0.p.t) })
            case ("response_item", "web_search_call"):
                // Logged once the search is over, with no output line to end it: nothing left running.
                let key = "codex:" + (p["call_id"] as? String ?? at), call = Self.codexCall(name: "web_search_call", p: p, at: ts)
                otherTool(O, key, call)
                if p["status"] as? String != "completed" { O.call = (p["call_id"] as? String ?? "", call) } else { otherResult(O, key, ok: true, ts, d: nil) }
            case ("response_item", let kind?) where kind.hasSuffix("_call"):
                let key = "codex:" + (p["call_id"] as? String ?? at), call = Self.codexCall(name: p["name"] as? String ?? kind, p: p, at: ts)
                O.call = (p["call_id"] as? String ?? "", call)
                otherTool(O, key, call, files: call.c == "edit" ? Self.codexFiles(p) : [])
            default:
                break
            }
        }
        stateDirty = true
    }

    /// Antigravity's own records (~/.gemini/antigravity-cli): its conversation in this folder, newest first, from
    /// conversation_summaries.db (its title and its run status: RUNNING or BUSY while it works, IDLE once it's the user's
    /// turn); that conversation's transcript.jsonl for the prompt, the context and its last reply's tool calls; and its own
    /// database (conversations/<id>.db) for the steps not over yet, which the transcript only gets once they're done: the
    /// tool call that runs, or one WAITING for the user's permission. Its subagents (the conversation's children) show as
    /// Claude's do. Its screen redrawing while the user types is no work.
    private func readAntigravity(_ O: OtherAI, cwd: String) {
        let root = HOME + "/.gemini/antigravity-cli"
        readAgyModel(O, root: root)
        readAgyConfirmations(O, root: root)
        guard let db = Self.agyOpen(root + "/conversation_summaries.db") else { return }
        defer { sqlite3_close(db) }
        let here = Self.realFolder(cwd)
        let claimed = Set(others.values.compactMap { $0 !== O && $0.tool == "Antigravity" && $0.endedAt == 0 ? $0.convId : nil })
        let sharedFolder = others.values.contains { $0 !== O && $0.tool == "Antigravity" && $0.endedAt == 0 && Self.realFolder($0.cwd) == here }
        var stickyId = (sharedFolder && O.turnOpen == true && O.convId != nil && !claimed.contains(O.convId!)) ? O.convId : nil
        if let logged = agyTurns[O.id]?.conversation, !claimed.contains(logged) { stickyId = logged }
        guard let (id, title, status) = Self.agyConversation(db, pid: O.pid, cwd: cwd, root: root, since: O.firstTs - 2000, excluding: claimed, stickyId: stickyId) else {
            // Nothing sent from this folder yet: the user's turn (its screen redrawing is no work, as its CPU said).
            if O.turnOpen != false || O.convId != nil {
                O.turnOpen = false
                O.transcriptOpen = false
                O.runningBgTasks.removeAll()
                O.convId = nil
                stateDirty = true
            }
            return
        }
        readAgyTranscript(O, root: root, id: id)
        let steps = Self.agySteps(root, id, sinceStep: O.userStepIdx, planIdx: O.plan?.idx)
        if steps?.canceled == true {
            O.transcriptOpen = false
            O.runningBgTasks.removeAll()
        }
        let summaryOpen = status.hasSuffix("_RUNNING") || status.hasSuffix("_BUSY") || status.hasSuffix("_CANCELING")
        let stepsActive = steps?.active == true
        var open = summaryOpen || stepsActive || O.transcriptOpen || !O.runningBgTasks.isEmpty
        if let logged = agyTurns[O.id], let working = logged.working {
            if working {
                open = true
            } else if nowMs() - logged.since >= 700 {
                // Its CLI is back at its prompt (a declined tool's ERROR or a background step's RUNNING in the transcript
                // say nothing then).
                open = false
                O.transcriptOpen = false
                O.runningBgTasks.removeAll()
            }
        }
        if O.turnOpen != open || O.title != title || O.convId != id {
            O.turnOpen = open
            O.title = title
            O.convId = id
            stateDirty = true
        }
        if !open, let plan = O.plan { closeAgyCalls(O, conversation: id, plan: plan, root: root, aid: nil) }
        // What runs, or waits for the user, right now: its steps not over yet.
        let was = (O.call?.p.l, O.waitsForUser)
        let shown = agyConfirms[O.id]?.pending
        if !open {
            O.call = nil
            O.waitsForUser = false
            // A turn over asks nothing any more.
            agyConfirms[O.id]?.pending = nil
        } else if let steps {
            O.stepsKnown = true
            let stepCall = O.plan.flatMap { plan in (steps.waiting ?? steps.open).flatMap { Self.agyCall(plan, step: $0) } }
            if let stepCall {
                O.call = ("", stepCall)
            }
            // The CLI's own log says when it shows a confirmation, for any tool (writing a file outside the workspace asks
            // too); without it, a waiting step of a tool that isn't a read, a search or an edit.
            let canWait = O.call.map { !["read", "search", "edit"].contains($0.p.c) } ?? true
            O.waitsForUser = shown != nil || (steps.waiting != nil && canWait)
            if let shown, let plan = O.plan, let call = Self.agyCall(plan, step: shown.step) { O.call = ("", call) }
        } else {
            O.stepsKnown = false
            O.waitsForUser = shown != nil
        }
        if was.0 != O.call?.p.l || was.1 != O.waitsForUser { stateDirty = true }
        readAntigravityAgents(O, db: db, parent: id, root: root)
    }

    /// Antigravity's conversation in `cwd`: the one its CLI says it's in there (cache/last_conversations.json, by folder),
    /// else its newest there (a folder as a file:// address, as it writes it). The desktop Antigravity's conversations share
    /// the list (app_data_dir "antigravity"): one of those, months old, is no CLI's. Folders compare with their links
    /// resolved: the CLI may write the one it was started in, the process has the real one. One nothing has touched since
    /// `since` (the CLI's start) is an earlier run's: a CLI starts a new conversation, so it has sent nothing yet — unless
    /// it was started with `--conversation <id>` or `-c` / `--continue`.
    private static func agyConversation(_ db: OpaquePointer, pid: Int32, cwd: String, root: String, since: Double, excluding claimed: Set<String> = [], stickyId: String? = nil) -> (id: String, title: String, status: String)? {
        let here = realFolder(cwd), cols = "conversation_id, title, status, workspace_uris, last_modified_time"
        let args = Proc.arguments(pid) ?? []
        var explicitId: String? = stickyId
        var continued = false
        for (i, a) in args.enumerated() {
            if (a == "--conversation" || a == "-r" || a == "--resume"), i + 1 < args.count {
                explicitId = args[i + 1]
            } else if a.hasPrefix("--conversation=") {
                explicitId = String(a.dropFirst("--conversation=".count))
            } else if a == "-c" || a == "--continue" {
                continued = true
            }
        }
        if let cid = explicitId, !cid.isEmpty, !claimed.contains(cid) {
            var row: (id: String, title: String, status: String)?
            agyRows(db, "SELECT \(cols) FROM conversation_summaries WHERE conversation_id = ?", [cid]) { col in
                row = (col(0), col(1), col(2))
                return false
            }
            if let row { return row }
        }
        // Its time ("2026-11-04 20:08:07.021044+00:00") or the live mtime of its transcript / WAL (since a background
        // `agy -p /usage` call can checkpoint and unlink conversation_summaries.db-wal while a TUI session runs).
        let liveTime = { (cid: String, iso: String) -> Double in
            let t0 = parseISO(iso)
            let t1 = fileStat(root + "/brain/" + cid + "/.system_generated/logs/transcript.jsonl")?.mtime ?? 0
            let t2 = fileStat(root + "/conversations/" + cid + ".db-wal")?.mtime ?? 0
            let t3 = fileStat(root + "/conversations/" + cid + ".db")?.mtime ?? 0
            return max(max(t0, t1), max(t2, t3))
        }
        let touched = { (cid: String, iso: String) -> Double? in
            let t = liveTime(cid, iso)
            if continued || t == 0 || t >= since { return t }
            return nil
        }
        var lastIds = Set<String>()
        if let data = FileManager.default.contents(atPath: root + "/cache/last_conversations.json"),
           let last = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for case let (dir, id as String) in last where realFolder(dir) == here && !claimed.contains(id) {
                lastIds.insert(id)
            }
        }
        var best: (row: (id: String, title: String, status: String), running: Bool, t: Double)?
        var seenIds = Set<String>()
        let consider = { (cid: String, title: String, status: String, iso: String) in
            guard seenIds.insert(cid).inserted, let t = touched(cid, iso) else { return }
            let run = status.hasSuffix("_RUNNING") || status.hasSuffix("_BUSY") || status.hasSuffix("_CANCELING")
            if let b = best {
                if run != b.running ? run : t > b.t { best = ((cid, title, status), run, t) }
            } else {
                best = ((cid, title, status), run, t)
            }
        }
        // Older CLIs' lists have no app_data_dir.
        for filter in ["nesting_depth = 0 AND IFNULL(app_data_dir, '') != 'antigravity'", "nesting_depth = 0"] {
            var read = false
            agyRows(db, "SELECT \(cols) FROM conversation_summaries WHERE \(filter) ORDER BY last_modified_time DESC LIMIT 40") { col in
                let cid = col(0)
                if claimed.contains(cid) { return true }
                let uris = (try? JSONSerialization.jsonObject(with: Data(col(3).utf8)) as? [String]) ?? []
                guard lastIds.contains(cid) || uris.contains(where: { URL(string: $0).map { realFolder($0.path) } == here }) else { return true }
                consider(cid, col(1), col(2), col(4))
                return true
            } done: { read = $0 }
            if read { break }
        }
        for id in lastIds where !seenIds.contains(id) {
            agyRows(db, "SELECT \(cols) FROM conversation_summaries WHERE conversation_id = ?", [id]) { col in
                consider(col(0), col(1), col(2), col(4))
                return false
            }
        }
        return best?.row
    }

    /// The calls of a conversation's last reply still open once it has stopped (its turn over, or a subagent the session
    /// killed): their steps never reached its transcript, so its own database says how they ended (3 done, 6 canceled;
    /// 1, 2, 8, 9 and 11 haven't yet).
    private func closeAgyCalls(_ O: OtherAI, conversation id: String, plan: AgyPlan, root: String, aid: String?) {
        let keys = plan.calls.indices.map { "agy:\(id):\(plan.idx):\($0)" }
        guard keys.contains(where: { otherCalls[$0]?.done == false }), let db = Self.agyOpen(root + "/conversations/" + id + ".db") else { return }
        defer { sqlite3_close(db) }
        var ended: [Int: String] = [:]
        Self.agyRows(db, "SELECT idx, status FROM steps WHERE idx > \(plan.idx) AND status NOT IN (0, 1, 2, 8, 9, 11)") { col in
            ended[Int(col(0)) ?? -1] = col(1)
            return true
        }
        for (k, key) in keys.enumerated() where otherCalls[key]?.done == false {
            guard let status = ended[plan.idx + 1 + k] else { continue }
            otherResult(O, key, ok: status == "3", nowMs(), d: nil, aid: aid)
        }
    }

    /// What an Antigravity CLI's own log says, as it writes it the moment it happens: its turn (`Sending user message to
    /// conversation <id>` starts one, as a background task's wake-up `[Sonar] Resolved active tags` does; the first
    /// `doRefreshQuota:` after it, not a forced one, ends it, as `Cancelling …` does: true of every turn end across 13 logs,
    /// a declined tool's too, and never mid-turn), and the confirmation or question it shows (`Surfacing tool
    /// confirmation: "WriteFile" at step 4`, `Surfacing ask_question at step 7`) until the user answers. Its log is the one
    /// whose first line names its pid ("Starting language server process with pid 94106"), read from the start once.
    private func readAgyConfirmations(_ O: OtherAI, root: String) {
        if agyConfirms[O.id] == nil {
            let dir = root + "/log", tag = "with pid \(O.pid)"
            let names = ((try? FileManager.default.contentsOfDirectory(atPath: dir)) ?? []).filter { $0.hasPrefix("cli-") && $0.hasSuffix(".log") }.sorted(by: >)
            guard let name = names.first(where: { name in
                guard let fh = FileHandle(forReadingAtPath: dir + "/" + name) else { return false }
                defer { try? fh.close() }
                let head = String(decoding: (try? fh.read(upToCount: 300)) ?? Data(), as: UTF8.self)
                return head.split(separator: "\n").first.map { $0.hasSuffix(tag) || $0.contains(tag + " ") } ?? false
            }) else { return }
            agyConfirms[O.id] = (dir + "/" + name, 0, nil)
            agyTurns[O.id] = (nil, 0, nil)
        }
        guard var c = agyConfirms[O.id], let st = fileStat(c.log), st.size > c.offset, let fh = FileHandle(forReadingAtPath: c.log) else { return }
        defer { try? fh.close() }
        let from = max(c.offset, st.size > 2 << 20 ? st.size - (2 << 20) : 0)
        try? fh.seek(toOffset: from)
        let data = fh.readDataToEndOfFile()
        guard let lastBreak = data.lastIndex(of: 0x0A) else { return }
        c.offset = from + UInt64(lastBreak - data.startIndex + 1)
        var turn = agyTurns[O.id] ?? (nil, 0, nil)
        let was = c.pending.map { "\($0.step):\($0.tool)" }, wasTurn = turn.working
        for raw in data[data.startIndex...lastBreak].split(separator: 0x0A) {
            let line = String(decoding: raw, as: UTF8.self)
            let at = Self.glogTime(line) ?? nowMs()
            if let r = line.range(of: "Sending user message to conversation ") {
                turn = (true, at, String(line[r.upperBound...].prefix { !$0.isWhitespace && $0 != "(" }))
            } else if line.contains("[Sonar] Resolved active tags"), turn.working != true {
                turn = (true, at, turn.conversation)
            } else if let r = line.range(of: "Surfacing tool confirmation: \"") {
                let rest = line[r.upperBound...]
                let tool = rest.prefix { $0 != "\"" }
                let step = rest.range(of: " at step ").flatMap { Int(rest[$0.upperBound...].prefix { $0.isNumber }) } ?? -1
                c.pending = (step, String(tool), at)
            } else if let r = line.range(of: "Surfacing ask_question at step ") {
                c.pending = (Int(line[r.upperBound...].prefix { $0.isNumber }) ?? -1, "a question", at)
            } else if line.contains("Responding to tool confirmation") || line.contains("] Tool confirmation for conversation")
                        || line.contains("cleared pending tool confirmation") || line.contains("Responding to pending ask_question")
                        || line.contains("AskQuestion response for conversation") || line.contains("cancelled ask_question")
                        || line.contains("AskQuestion cancelled") {
                c.pending = nil
            } else if turn.working == true, (line.contains("] doRefreshQuota:") && !line.contains("force=true") && !line.contains("not logged in"))
                        || line.contains("Cancelling in-progress response") || line.contains("] Cancelling conversation ") {
                turn = (false, at, turn.conversation)
                c.pending = nil
            }
        }
        agyConfirms[O.id] = c
        agyTurns[O.id] = turn
        if was != c.pending.map({ "\($0.step):\($0.tool)" }) || wasTurn != turn.working { stateDirty = true }
        // Queued input goes out a moment after a turn ends: an idle that short is no turn of the user's. Look again then.
        if turn.working == false, nowMs() - turn.since < 700 {
            queue.asyncAfter(deadline: .now() + 0.75) { self.agyChanged() }
        }
    }

    /// A glog line's time ("I1111 00:00:39.359043 …", local, without a year), in ms.
    private static func glogTime(_ line: String) -> Double? {
        let parts = line.split(separator: " ", maxSplits: 2)
        guard parts.count >= 2, parts[0].count == 5, let month = Int(parts[0].dropFirst().prefix(2)), let day = Int(parts[0].suffix(2)) else { return nil }
        let hms = parts[1].split(separator: ":")
        guard hms.count == 3, let h = Int(hms[0]), let m = Int(hms[1]), let sec = Double(hms[2]) else { return nil }
        let cal = Calendar.current, now = Date()
        var dc = cal.dateComponents([.year], from: now)
        dc.month = month
        dc.day = day
        dc.hour = h
        dc.minute = m
        dc.second = Int(sec)
        guard var date = cal.date(from: dc) else { return nil }
        if date > now.addingTimeInterval(86_400) { date = cal.date(byAdding: .year, value: -1, to: date) ?? date }
        return (date.timeIntervalSince1970 + sec.truncatingRemainder(dividingBy: 1)) * 1000
    }

    /// A folder as the file system has it, its links resolved.
    private static func realFolder(_ path: String) -> String {
        URL(fileURLWithPath: path).standardizedFileURL.resolvingSymlinksInPath().path
    }

    /// The model Antigravity's CLI runs on, as its log names it at the start and on each change ("Propagating selected model
    /// override to backend: label="Gemini 3.8 Flash (High)""): the card's model and effort, and its context window for the
    /// gauge (Gemini's 1M tokens, Claude's 200k), which its records don't give. Read again only when the log changes, its
    /// last 256 KB (cli.log is the newest run's).
    private func readAgyModel(_ O: OtherAI, root: String) {
        let path = root + "/cli.log"
        guard let st = fileStat(path), "\(st.size):\(st.mtime)" != O.modelMark, let fh = FileHandle(forReadingAtPath: path) else { return }
        defer { try? fh.close() }
        O.modelMark = "\(st.size):\(st.mtime)"
        try? fh.seek(toOffset: st.size > 256 << 10 ? st.size - (256 << 10) : 0)
        let text = String(decoding: fh.readDataToEndOfFile(), as: UTF8.self)
        guard let r = text.range(of: "selected model override to backend: label=\"", options: .backwards),
              let end = text[r.upperBound...].firstIndex(of: "\"") else { return }
        let label = String(text[r.upperBound..<end])
        var model = label, effort = ""
        if let m = label.range(of: #"\s*\((low|medium|high|xhigh|max|thinking)\)\s*$"#, options: [.regularExpression, .caseInsensitive]) {
            model = String(label[..<m.lowerBound])
            effort = label[m].trimmingCharacters(in: CharacterSet(charactersIn: "() ")).lowercased()
        }
        let lower = model.lowercased()
        let window = (lower.contains("gemini") || lower.contains("argon")) ? 1_048_576.0 : 200_000.0
        if model != O.model || effort != O.effort || window != O.ctxMax {
            O.model = model
            O.effort = effort
            O.ctxMax = window
            stateDirty = true
        }
    }

    /// The conversation's transcript, read on from where it was (a new conversation: from the start): the prompt, the
    /// context, its last reply's tool calls (the last of them runs until a step is over, when its steps can't be read),
    /// and the subagents it started.
    private func readAgyTranscript(_ O: OtherAI, root: String, id: String) {
        let path = root + "/brain/" + id + "/.system_generated/logs/transcript.jsonl"
        if O.log != path {
            O.log = path
            O.logOffset = 0
            O.plan = nil
            O.transcriptOpen = false
            O.userStepIdx = 0
            O.runningBgTasks.removeAll()
        }
        guard let st = fileStat(path), st.size > O.logOffset, let fh = FileHandle(forReadingAtPath: path) else { return }
        defer { try? fh.close() }
        let from = max(O.logOffset, st.size > 2 << 20 ? st.size - (2 << 20) : 0)
        try? fh.seek(toOffset: from)
        let data = fh.readDataToEndOfFile()
        guard let lastBreak = data.lastIndex(of: 0x0A) else { return }
        O.logOffset = from + UInt64(lastBreak - data.startIndex + 1)
        for line in data[data.startIndex...lastBreak].split(separator: 0x0A) {
            guard let j = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any] else { continue }
            let kind = j["type"] as? String ?? "", step = j["status"] as? String ?? ""
            let ts = parseISO(j["created_at"] as? String), idx = int(j["step_index"])
            switch kind {
            case "USER_INPUT":
                O.turnStart = ts
                O.userStepIdx = idx
                O.transcriptOpen = true
                O.runningBgTasks.removeAll()
                let asked = Self.agyRequest(j["content"])
                O.prompt = clip(asked, 200)
                otherText(O, "agy:\(id):\(idx):in", "prompt", asked, ts)
                O.call = nil
                O.plan = nil
            case "PLANNER_RESPONSE":
                if let n = j["input_tokens"] as? NSNumber { O.ctx = n.intValue + int(j["cache_read_tokens"]) }
                otherTokens(O, "agy:\(id):\(idx):tok", ts, int(j["input_tokens"]), int(j["output_tokens"]), int(j["cache_read_tokens"]))
                if let text = j["content"] as? String { otherText(O, "agy:\(id):\(idx):say", "say", text, ts) }
                // A reply that calls tools: they run (or wait) next, a step each.
                let calls = j["tool_calls"] as? [[String: Any]] ?? []
                O.plan = calls.isEmpty ? nil : AgyPlan(idx: idx, calls: calls, ts: ts)
                O.call = calls.last.map { ("", Self.agyTool($0, at: ts)) }
                O.transcriptOpen = !calls.isEmpty || !O.runningBgTasks.isEmpty
                for (k, call) in calls.enumerated() {
                    let p = Self.agyTool(call, at: ts)
                    otherTool(O, "agy:\(id):\(idx):\(k)", p, files: Self.agyFile(call, kind: p.c).map { [$0] } ?? [])
                }
            default:
                if kind == "SYSTEM_MESSAGE", let text = j["content"] as? String {
                    if let r = text.range(of: #"task-\d+"#, options: .regularExpression) { O.runningBgTasks.remove(String(text[r])) }
                    O.transcriptOpen = true
                } else {
                    if step == "RUNNING", let text = j["content"] as? String,
                       let r = text.range(of: #"task-\d+"#, options: .regularExpression) {
                        O.runningBgTasks.insert(String(text[r]))
                    }
                    // A tool the user declined ends the turn there, with no reply after it.
                    O.transcriptOpen = step != "CANCELED" && !(step == "ERROR" && (j["content"] as? String ?? "").contains("user denied permission"))
                }
                // A tool's own step: done, it no longer waits; still running or waiting, it does. Its call's result counts.
                if step == "DONE" || step == "ERROR" || step == "CANCELED" {
                    O.call = nil
                    if let plan = O.plan, kind != "SYSTEM_MESSAGE", plan.calls.indices.contains(idx - plan.idx - 1) {
                        otherResult(O, "agy:\(id):\(plan.idx):\(idx - plan.idx - 1)", ok: step == "DONE", ts, d: Self.agyDuration(j["content"]))
                    }
                }
                // One that started subagents says which, in the order the call asked for them (their roles, prompts).
                guard let plan = O.plan, let call = Self.agyPlanned(plan, step: idx), call["name"] as? String == "invoke_subagent",
                      let text = j["content"] as? String else { break }
                let args = call["args"] as? [String: Any] ?? [:]
                let asked = Self.agyValue(args["Subagents"]) as? [[String: Any]] ?? [args]
                let children = text.components(separatedBy: "\"conversationId\"").dropFirst()
                    .compactMap { $0.split(separator: "\"", maxSplits: 2).dropFirst().first.map(String.init) }
                for (k, child) in children.enumerated() {
                    let spec = asked[min(k, asked.count - 1)]
                    O.agentRoles[child] = (Self.agyArg(spec["Role"]) ?? "", Self.agyArg(spec["Prompt"]) ?? "")
                }
            }
        }
        stateDirty = true
    }

    /// Antigravity's subagents: its conversation's children in conversation_summaries.db, each running or done, with its
    /// role, what it was asked and the tool it's on (its steps; its transcript, read again when it changes), as Claude's
    /// subagents are shown. One waiting for the user's permission is the session's wait.
    private func readAntigravityAgents(_ O: OtherAI, db: OpaquePointer, parent: String, root: String) {
        let now = nowMs()
        var views: [[String: Any]] = [], seen = Set<String>(), waiting: Pending?
        Self.agyRows(db, "SELECT conversation_id, title, status, agent_name, killed FROM conversation_summaries "
                     + "WHERE parent_conversation_id = ? ORDER BY last_modified_time DESC LIMIT 12", [parent]) { col in
            let id = col(0), title = col(1), status = col(2), agent = col(3)
            seen.insert(id)
            let running = (status.hasSuffix("_RUNNING") || status.hasSuffix("_BUSY")) && col(4) != "1"
            let path = root + "/brain/" + id + "/.system_generated/logs/transcript.jsonl"
            let mtime = fileStat(path)?.mtime ?? 0
            var log = O.agentLogs[id] ?? AgyLog()
            if mtime != log.mtime {
                log = Self.agyLog(path, mtime: mtime, id: id)
                O.agentLogs[id] = log
                stateDirty = true
                // Its calls and tokens count as the session's, as a Claude subagent's do.
                for u in log.usage { otherTokens(O, u.key, u.ts, u.i, u.o, u.r) }
                for c in log.calls { otherTool(O, c.key, c.p, files: c.file.map { [$0] } ?? [], aid: id) }
                for r in log.results { otherResult(O, r.key, ok: r.ok, r.ts, d: r.d, aid: id) }
            }
            if !running, let plan = log.plan { closeAgyCalls(O, conversation: id, plan: plan, root: root, aid: id) }
            // Done more than 15 minutes ago: off the list, as Claude's.
            guard running || now - mtime < 15 * Self.MIN else { return true }
            var call: Pending?, waits = false
            if running, let plan = log.plan {
                if let steps = Self.agySteps(root, id, sinceStep: plan.idx, planIdx: plan.idx) {
                    call = (steps.waiting ?? steps.open).flatMap { Self.agyCall(plan, step: $0) }
                    let canWait = call.map { !["read", "search", "edit"].contains($0.c) } ?? true
                    waits = steps.waiting != nil && canWait
                } else {
                    call = plan.calls.last.map { Self.agyTool($0, at: plan.ts) }
                }
            }
            if waits, waiting == nil { waiting = call ?? Pending(n: "Agent", c: "agent", l: "a step", t: now) }
            let asked = O.agentRoles[id]
            let firstLine = (asked?.prompt.isEmpty == false ? asked!.prompt : log.prompt).split(whereSeparator: \.isNewline).first.map(String.init)
            let desc = [asked?.role, title, firstLine, agent].compactMap { $0 }.first { !$0.isEmpty } ?? "subagent"
            var v: [String: Any] = [
                "id": id, "sid": O.id, "desc": clip(desc, 90), "type": agent == "self" ? "" : agent, "model": O.model, "bg": true,
                "running": running, "firstTs": log.firstTs > 0 ? log.firstTs : mtime, "lastTs": max(log.lastTs, mtime),
                "tools": log.tools, "errors": log.errors, "web": log.web, "cost": 0.0,
                "tok": ["in": log.tokIn, "out": log.tokOut, "cr": log.tokCache, "cw": 0], "pending": call.map { [$0.dict] } ?? [[String: Any]](),
                "loop": false,
            ]
            if let call { v["last"] = call.dict }
            views.append(v)
            return true
        }
        O.agentLogs = O.agentLogs.filter { seen.contains($0.key) }
        let key = { (list: [[String: Any]]) in list.map { "\($0["id"] ?? "")\($0["running"] ?? "")\(($0["last"] as? [String: Any])?["l"] ?? "")" } }
        if key(views) != key(O.agents) || waiting?.l != O.agentWaiting?.l { stateDirty = true }
        O.agents = views
        O.agentWaiting = waiting
    }

    /// A subagent's whole transcript (it's short): when it started and last moved, what it was asked, its last reply's
    /// tool calls, and its counts (tools, errors, web, tokens), as Claude's subagents have them; and each call, its result
    /// and each reply's tokens, named by `id` (the subagent's conversation), for the day's counts.
    private static func agyLog(_ path: String, mtime: Double, id: String) -> AgyLog {
        var log = AgyLog(mtime: mtime)
        guard let data = FileManager.default.contents(atPath: path) else { return log }
        for line in data.split(separator: 0x0A) {
            guard let j = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any] else { continue }
            let ts = parseISO(j["created_at"] as? String), idx = int(j["step_index"]), step = j["status"] as? String ?? ""
            if log.firstTs == 0 { log.firstTs = ts }
            log.lastTs = max(log.lastTs, ts)
            if step == "ERROR" { log.errors += 1 }
            switch j["type"] as? String {
            case "SYSTEM_MESSAGE" where log.prompt.isEmpty:
                // The session's message to it: what it was asked.
                let text = j["content"] as? String ?? ""
                if let r = text.range(of: " content=") {
                    log.prompt = String(text[r.upperBound...]).replacingOccurrences(of: "</SYSTEM_MESSAGE>", with: "")
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                }
            case "USER_INPUT" where log.prompt.isEmpty:
                log.prompt = agyRequest(j["content"])
            case "PLANNER_RESPONSE":
                let calls = j["tool_calls"] as? [[String: Any]] ?? []
                log.plan = calls.isEmpty ? nil : AgyPlan(idx: idx, calls: calls, ts: ts)
                log.tools += calls.count
                log.web += calls.filter { ["web", "browser"].contains(agyTool($0, at: ts).c) }.count
                log.tokIn += int(j["input_tokens"])
                log.tokOut += int(j["output_tokens"])
                log.tokCache += int(j["cache_read_tokens"])
                log.usage.append(("agy:\(id):\(idx):tok", ts, int(j["input_tokens"]), int(j["output_tokens"]), int(j["cache_read_tokens"])))
                for (k, call) in calls.enumerated() {
                    let p = agyTool(call, at: ts)
                    log.calls.append(("agy:\(id):\(idx):\(k)", p, agyFile(call, kind: p.c)))
                }
            case let kind? where kind != "USER_INPUT" && kind != "SYSTEM_MESSAGE":
                // A tool's own step, right after the reply that called it.
                guard let plan = log.plan, ["DONE", "ERROR", "CANCELED"].contains(step), plan.calls.indices.contains(idx - plan.idx - 1) else { break }
                log.results.append(("agy:\(id):\(plan.idx):\(idx - plan.idx - 1)", step == "DONE", ts, agyDuration(j["content"])))
            default: break
            }
        }
        return log
    }

    /// A conversation's steps not over yet, from its own database: whether any step in the current turn is still active
    /// (1 pending, 2 running, 8 model generating reply, 9 waiting, 11 queued), the first tool step that runs, and the
    /// first WAITING for the user's permission. Nil: it can't be read.
    private static func agySteps(_ root: String, _ id: String, sinceStep: Int = 0, planIdx: Int? = nil) -> (active: Bool, open: Int?, waiting: Int?, canceled: Bool)? {
        guard let db = agyOpen(root + "/conversations/" + id + ".db") else { return nil }
        defer { sqlite3_close(db) }
        var active = false, open: Int?, waiting: Int?, lastStatus = 0, read = false
        let minPlan = planIdx ?? sinceStep
        agyRows(db, "SELECT idx, status FROM steps WHERE idx >= \(max(0, sinceStep)) ORDER BY idx") { col in
            let idx = Int(col(0)) ?? 0, st = Int(col(1)) ?? 0
            lastStatus = st
            if [1, 2, 8, 9, 11].contains(st) { active = true }
            if idx > minPlan {
                if [1, 2, 9, 11].contains(st), open == nil { open = idx }
                if st == 9 { waiting = idx } else if st == 2 || st == 3 || st == 8 { waiting = nil }
            }
            return true
        } done: { read = $0 }
        guard read else { return nil }
        return (active, open, waiting, !active && lastStatus == 6)
    }

    /// The tool call a step runs: the reply's calls run in order, a step each, right after it.
    private static func agyPlanned(_ plan: AgyPlan, step: Int) -> [String: Any]? {
        let k = step - plan.idx - 1
        return plan.calls.indices.contains(k) ? plan.calls[k] : nil
    }

    private static func agyCall(_ plan: AgyPlan, step: Int) -> Pending? {
        agyPlanned(plan, step: step).map { agyTool($0, at: plan.ts) }
    }

    /// A read-only connection to one of Antigravity's databases: always tries `mode=ro` first so any live WAL is included,
    /// falling back to `immutable=1` when the WAL was merged in and removed.
    private static func agyOpen(_ path: String) -> OpaquePointer? {
        guard FileManager.default.fileExists(atPath: path) else { return nil }
        for mode in ["mode=ro", "immutable=1"] {
            var db: OpaquePointer?
            let url = "file:" + path.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed)! + "?" + mode
            if sqlite3_open_v2(url, &db, SQLITE_OPEN_READONLY | SQLITE_OPEN_URI, nil) == SQLITE_OK {
                sqlite3_busy_timeout(db, 200)
                if sqlite3_exec(db, "SELECT 1 FROM sqlite_master LIMIT 1", nil, nil, nil) == SQLITE_OK { return db }
            }
            sqlite3_close(db)
        }
        return nil
    }

    /// Each row of a query (its columns as text) until `row` says stop; `done` hears whether it read.
    private static func agyRows(_ db: OpaquePointer, _ sql: String, _ args: [String] = [], _ row: ((Int32) -> String) -> Bool,
                                done: ((Bool) -> Void)? = nil) {
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            done?(false)
            return
        }
        defer { sqlite3_finalize(stmt) }
        for (i, arg) in args.enumerated() {
            sqlite3_bind_text(stmt, Int32(i + 1), arg, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
        }
        let col = { (i: Int32) in sqlite3_column_text(stmt, i).map { String(cString: $0) } ?? "" }
        var rc = sqlite3_step(stmt)
        while rc == SQLITE_ROW, row(col) { rc = sqlite3_step(stmt) }
        done?(rc == SQLITE_ROW || rc == SQLITE_DONE)
    }

    /// What the user asked in an Antigravity step: the request, without what Antigravity adds to it (the time…).
    private static func agyRequest(_ v: Any?) -> String {
        let s = v as? String ?? ""
        if let a = s.range(of: "<USER_REQUEST>"), let b = s.range(of: "</USER_REQUEST>", range: a.upperBound..<s.endIndex) {
            return s[a.upperBound..<b.lowerBound].trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// An Antigravity tool call's argument as it was meant: its transcript writes each as JSON (a string in quotes, a list…).
    private static func agyValue(_ v: Any?) -> Any? {
        guard let s = v as? String, let data = s.data(using: .utf8),
              let decoded = try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed) else { return v }
        return decoded
    }

    private static func agyArg(_ v: Any?) -> String? {
        switch agyValue(v) {
        case let s as String: return s
        case let list as [Any]: return list.compactMap { agyArg($0) }.joined(separator: ", ")
        case nil, is NSNull: return nil
        case let other?: return "\(other)"
        }
    }

    /// An Antigravity tool call as Claude's tools are shown: its kind (a shell, the web, a file…) and what it's on.
    private static func agyTool(_ call: [String: Any], at: Double) -> Pending {
        let name = call["name"] as? String ?? "tool"
        let args = call["args"] as? [String: Any] ?? [:]
        let what = ["CommandLine", "Command", "command", "Query", "query", "queries", "Url", "url", "Uri", "AbsolutePath", "TargetFile",
                    "File", "FilePath", "Path", "path", "SearchPath", "DirectoryPath", "Pattern", "Role", "ServerName", "toolSummary", "Prompt"]
            .lazy.compactMap { agyArg(args[$0]) }.first { !$0.isEmpty } ?? name
        let (n, c): (String, String)
        switch name {
        case "run_command", "read_terminal", "send_command_input", "command_status": (n, c) = ("Bash", "bash")
        case "search_web": (n, c) = ("WebSearch", "web")
        case "read_url_content", "view_content_chunk": (n, c) = ("WebFetch", "web")
        case let x where x.hasPrefix("browser_") || x.hasSuffix("_browser_url") || x.hasSuffix("_browser_page") || x == "capture_browser_screenshot":
            (n, c) = ("Browser", "browser")
        // read_file is the CLI's (1.5); view_file the desktop app's.
        case "view_file", "view_file_outline", "view_code_item", "list_dir", "read_file", "list_directory": (n, c) = ("Read", "read")
        case "grep_search", "find_by_name", "codebase_search", "search_files", "grep", "glob": (n, c) = ("Grep", "search")
        case let x where x.contains("write") || x.contains("replace") || x.contains("edit") || x.contains("create_file") || x.contains("delete_file"):
            (n, c) = ("Edit", "edit")
        case "invoke_subagent": (n, c) = ("Agent", "agent")
        // Messaging, listing or killing its subagents, as Claude's SendMessage, ListAgents and TaskStop are.
        case "manage_subagents": (n, c) = (name, "agent")
        case let x where x.hasPrefix("mcp"): (n, c) = ("MCP", "mcp")
        default: (n, c) = (name, "plan")
        }
        return Pending(n: n, c: c, l: clip(what, 120), t: at)
    }

    /// The file an Antigravity call reads or edits, for files.heat.
    private static func agyFile(_ call: [String: Any], kind: String) -> String? {
        guard kind == "read" || kind == "edit" else { return nil }
        let args = call["args"] as? [String: Any] ?? [:]
        return ["AbsolutePath", "TargetFile", "File", "FilePath", "Path", "path"].lazy
            .compactMap { agyValue(args[$0]) as? String }.first { !$0.isEmpty }
    }

    /// How long an Antigravity tool step took: its result starts "Created At: …\nCompleted At: …".
    private static func agyDuration(_ content: Any?) -> Double? {
        guard let s = content as? String,
              let r = s.range(of: #"Created At:\s*\S+\s+Completed At:\s*\S+"#, options: .regularExpression) else { return nil }
        let words = s[r].split(whereSeparator: \.isWhitespace)
        guard words.count == 6 else { return nil }
        let from = parseISO(String(words[2])), to = parseISO(String(words[5]))
        return from > 0 && to >= from ? to - from : nil
    }

    /// A Codex tool call as a pending tool: its shell command, the files it patches, or what it looks up on the web.
    private static func codexCall(name: String, p: [String: Any], at: Double) -> Pending {
        let input = (p["input"] as? String) ?? (p["arguments"] as? String) ?? ""
        if name.contains("patch") { return Pending(n: "Edit", c: "edit", l: "apply patch", t: at) }
        if name.contains("web_search") {
            let action = p["action"] as? [String: Any] ?? [:]
            let what = [action["query"], action["url"]].compactMap { $0 as? String }.first { !$0.isEmpty }
            return Pending(n: "WebSearch", c: "web", l: clip(what ?? "web search", 120), t: at)
        }
        // `tools.exec_command({"cmd":"…"})`, or the older shell call's {"command":["bash","-lc","…"]}.
        var command = ""
        if let r = input.range(of: #""cmd"\s*:\s*"((?:[^"\\]|\\.)*)""#, options: .regularExpression) {
            command = String(input[r]).replacingOccurrences(of: #"^"cmd"\s*:\s*""#, with: "", options: .regularExpression)
            command = String(command.dropLast()).replacingOccurrences(of: "\\\"", with: "\"")
        } else if let data = input.data(using: .utf8), let j = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let parts = j["command"] as? [String] {
            command = parts.last ?? ""
        }
        return Pending(n: "Bash", c: "bash", l: clip(command.isEmpty ? name : command, 120), t: at)
    }

    /// Whether a Codex call went well: its shell's output says "Exit code: N" or "exit_code":N (0: it did); a patch's or
    /// another's says nothing of the kind and counts as done. Newer Codex gives the output as parts of text.
    private static func codexOk(_ output: Any?) -> Bool {
        var s = output as? String ?? ""
        if let parts = output as? [[String: Any]] {
            s = parts.compactMap { $0["text"] as? String }.joined(separator: "\n")
        } else if s.isEmpty, let output, JSONSerialization.isValidJSONObject(output), let data = try? JSONSerialization.data(withJSONObject: output) {
            s = String(decoding: data, as: UTF8.self)
        }
        let head = String(s.prefix(400))
        guard let r = head.range(of: #"(?i)exit[ _]code"?:?\s*-?\d+"#, options: .regularExpression),
              let n = head[r].range(of: #"-?\d+$"#, options: .regularExpression) else { return true }
        return Int(head[r][n]) == 0
    }

    /// The files a Codex patch adds, changes or deletes ("*** Update File: …"), for files.heat.
    private static func codexFiles(_ p: [String: Any]) -> [String] {
        (p["input"] as? String ?? "").components(separatedBy: .newlines).compactMap { line in
            guard let head = ["*** Add File: ", "*** Update File: ", "*** Delete File: "].first(where: { line.hasPrefix($0) }) else { return nil }
            let file = line.dropFirst(head.count).trimmingCharacters(in: .whitespaces)
            return file.isEmpty ? nil : file
        }
    }

    /// The newest unclaimed Codex log of the last week begun in `cwd` and written since `since` (seconds). A log belongs
    /// to one live process: without `excluding`, two Codex chats in the same folder both followed whichever wrote last.
    private static func codexLog(cwd: String, since: Double, excluding: Set<String>) -> String? {
        let root = (ProcessInfo.processInfo.environment["CODEX_HOME"] ?? HOME + "/.codex") + "/sessions"
        let fm = FileManager.default
        var found: (path: String, score: Double, mtime: Double)?
        let day = DateFormatter()
        day.dateFormat = "yyyy/MM/dd"
        for back in 0..<7 {
            let dir = root + "/" + day.string(from: Date().addingTimeInterval(Double(-back) * 86_400))
            for name in (try? fm.contentsOfDirectory(atPath: dir)) ?? [] where name.hasSuffix(".jsonl") {
                let path = dir + "/" + name
                guard !excluding.contains(path) else { continue }
                guard let mtime = (try? fm.attributesOfItem(atPath: path))?[.modificationDate] as? Date,
                      mtime.timeIntervalSince1970 >= since - 5,
                      let fh = FileHandle(forReadingAtPath: path) else { continue }
                let head = fh.readData(ofLength: 64 << 10)
                try? fh.close()
                guard let first = head.split(separator: 0x0A).first,
                      let j = try? JSONSerialization.jsonObject(with: Data(first)) as? [String: Any],
                      (j["payload"] as? [String: Any])?["cwd"] as? String == cwd else { continue }
                let created = parseISO(j["timestamp"] as? String)
                let score = created > 0 ? abs(created / 1000 - since) : abs(mtime.timeIntervalSince1970 - since)
                if found == nil || score < found!.score || (score == found!.score && mtime.timeIntervalSince1970 > found!.mtime) {
                    found = (path, score, mtime.timeIntervalSince1970)
                }
            }
        }
        return found?.path
    }

    private func matchTabs() {
        for S in sessions.values {
            let tab = S.live ? S.ppid.flatMap { appShells[$0] } : nil
            if tab != S.hostTab { stateDirty = true }
            S.hostTab = tab
        }
        for O in others.values {
            // Codex may be behind an npm/node launcher. Walk to the shell as Windows already does instead of requiring
            // its direct parent to be the app's shell.
            var tab: String?
            var pid = O.pid
            if O.endedAt == 0 {
                for _ in 0..<8 {
                    if let hit = appShells[pid] { tab = hit; break }
                    guard let parent = Proc.parent(pid), parent > 1 else { break }
                    pid = parent
                }
            }
            if tab != O.hostTab { stateDirty = true }
            O.hostTab = tab
        }
    }

    // MARK: snapshot

    /// The session's name, or its folder's with the start of its id.
    private func displayName(_ S: Session) -> String {
        S.name.isEmpty ? clip(((S.cwd as NSString).lastPathComponent) + "-" + S.id.prefix(2), 24) : S.name
    }

    private func statusOf(_ S: Session, _ now: Double) -> String {
        if S.live {
            switch S.reg {
            // "shell": Claude's turn is over and only a background shell (a server, a watcher) is still running.
            case "idle", "shell": return "idle"
            case "waiting": return "waiting"
            default: return "busy"
            }
        }
        return now - S.lastTs < 90_000 ? "busy" : "ended"
    }

    private func pendingList(_ t: Track, _ now: Double) -> [[String: Any]] {
        t.pending.filter { now - $0.p.t < 3 * 3_600_000 }.map { $0.p.dict }
    }

    private func agentView(_ A: SubAgent, _ S: Session, _ now: Double) -> [String: Any] {
        let running = !A.pending.isEmpty || (!A.endTurn && now - A.lastTs < (S.reg == "busy" ? 15 : 3) * Self.MIN)
        var v: [String: Any] = [
            "id": A.id, "sid": A.sid, "desc": A.desc.isEmpty ? (A.type.isEmpty ? String(A.id.prefix(8)) : A.type) : A.desc,
            "type": A.type, "model": shortModel(A.model), "bg": A.bg, "running": running,
            "firstTs": A.firstTs, "lastTs": A.lastTs, "tools": A.tools, "errors": A.errors, "web": A.web,
            "cost": A.cost, "tok": A.tokDict, "pending": pendingList(A, now), "loop": A.isLoop,
        ]
        if let last = A.last { v["last"] = last.dict }
        return v
    }

    private static let statusOrder = ["waiting": 0, "idle": 1, "busy": 2, "ended": 3]

    private func snapshot() -> (json: [String: Any], briefs: [SessionBrief]) {
        let now = nowMs()
        var list: [[String: Any]] = []
        var briefs: [SessionBrief] = []
        var runningAgents = 0
        var pendingByCat = Dictionary(uniqueKeysWithValues: CATS.map { ($0, 0) })
        let agentsBySession = Dictionary(grouping: agents.values, by: { $0.sid })

        for S in sessions.values {
            if let ended = dismissed[S.id] {
                guard S.live, let pid = S.pid, pid != ended else { continue }
                dismissed[S.id] = nil
            }
            // A compacted conversation shows once, as the session it continues in.
            if S.supersededBy != nil, !S.live { continue }
            var status = statusOf(S, now)
            // Claude ended its turn to wait for its background subagents: not the user's turn yet. Nor right after
            // one has finished; Claude picks its result up a moment later.
            if status == "idle", (agentsBySession[S.id] ?? []).contains(where: { A in
                A.bg && (!A.pending.isEmpty || (!A.endTurn && now - A.lastTs < 3 * Self.MIN) || now - A.lastTs < 20_000)
            }) {
                status = "busy"
            }
            let host: String? = S.hostTab != nil ? "app" : (S.live ? "term" : nil)
            guard S.live || now - S.lastTs < 30 * Self.MIN else { continue }
            let subs = (agentsBySession[S.id] ?? [])
                .map { agentView($0, S, now) }
                .filter { ($0["running"] as? Bool) == true || now - ($0["lastTs"] as? Double ?? 0) < 15 * Self.MIN }
                .sorted {
                    let ra = ($0["running"] as? Bool) == true, rb = ($1["running"] as? Bool) == true
                    if ra != rb { return ra }
                    return ($0["lastTs"] as? Double ?? 0) > ($1["lastTs"] as? Double ?? 0)
                }
            let nRun = subs.filter { ($0["running"] as? Bool) == true }.count
            runningAgents += nRun
            let pending = pendingList(S, now)
            for p in pending { pendingByCat[p["c"] as? String ?? "plan", default: 0] += 1 }
            for a in subs { for p in a["pending"] as? [[String: Any]] ?? [] { pendingByCat[p["c"] as? String ?? "plan", default: 0] += 1 } }
            let k0 = Int(now / 20_000)
            let spark = ((k0 - 29)...k0).map { S.spark[$0] ?? 0 }
            var flags: [String] = []
            if S.isLoop || subs.contains(where: { ($0["loop"] as? Bool) == true }) { flags.append("loop?") }
            if status == "busy", pending.contains(where: { now - ($0["t"] as? Double ?? now) > 3 * Self.MIN }) { flags.append("slow tool") }
            if S.ctxMax > 0, Double(S.ctx) / S.ctxMax > 0.8 { flags.append("ctx 80%+") }
            var item: [String: Any] = [
                "id": S.id, "name": displayName(S),
                "tool": "Claude Code",
                "title": S.title, "lastPrompt": S.lastPrompt, "cwd": cwdLabel(S.cwd), "branch": S.branch,
                "model": shortModel(S.model), "effort": S.effort, "status": status, "live": S.live,
                "statusSince": S.live ? S.statusSince : (S.endedAt > 0 ? S.endedAt : S.lastTs),
                "cpu": S.cpu, "mem": S.mem, "kind": S.kind, "entry": S.entry,
                "firstTs": S.firstTs, "lastTs": S.lastTs, "ctx": S.ctx, "ctxMax": S.ctxMax, "turnMs": S.turnMs,
                "tok": S.tokDict, "cost": S.cost, "tools": S.tools, "errors": S.errors, "web": S.web, "prompts": S.prompts,
                "byCat": S.byCat, "pending": pending, "spark": spark, "flags": flags, "agents": subs, "agentsRunning": nRun,
            ]
            item["waitingFor"] = orNull(S.waitingFor)
            item["tty"] = orNull(S.tty)
            item["pid"] = orNull(S.pid.map { Int($0) })
            item["host"] = orNull(host)
            item["tab"] = orNull(S.hostTab)
            if let last = S.last { item["last"] = last.dict }
            list.append(item)

            var brief = SessionBrief(id: S.id, name: S.name.isEmpty ? String(S.id.prefix(8)) : S.name, title: S.title.isEmpty ? S.lastPrompt : S.title,
                                     status: status, waitingFor: S.waitingFor, cwd: S.cwd, live: S.live, pid: S.pid, host: host, tab: S.hostTab)
            brief.model = shortModel(S.model)
            brief.effort = S.effort
            brief.ctx = S.ctx
            brief.ctxMax = S.ctxMax
            brief.cost = S.cost
            brief.tools = S.tools
            brief.web = S.web
            brief.errors = S.errors
            brief.statusSince = S.live ? S.statusSince : S.lastTs
            brief.turnMs = S.turnMs
            brief.spark = spark
            brief.agentsRunning = nRun
            let running = S.pending.first?.p ?? agentsBySession[S.id]?.compactMap { $0.pending.first?.p }.first
            if let p = running, now - p.t < 3 * 3_600_000 {
                brief.actionName = p.n
                brief.actionCat = p.c
                brief.actionLabel = p.l
                brief.actionSince = p.t
            }
            briefs.append(brief)
        }
        // The other AI tools, after Claude's (a window with both shows Claude): what Claude's sessions show, minus what
        // only its transcript would tell.
        for O in others.values {
            if let ended = dismissed[O.id], ended == O.pid { continue }
            let live = O.endedAt == 0
            // What it runs: a shell of its own right now, else the tool call its log has it on.
            let running = otherCommand(O).map { Pending(n: "Bash", c: "bash", l: $0, t: O.commandSince) } ?? O.call?.p
            let (status, waiting) = otherStatus(O, now)
            // Its subagents end with it.
            let agents = live ? O.agents : O.agents.map { var a = $0; a["running"] = false; a["pending"] = [[String: Any]](); return a }
            let agentsRunning = agents.filter { $0["running"] as? Bool == true }.count
            runningAgents += agentsRunning
            for p in (running.map { [$0.dict] } ?? []) + agents.flatMap({ $0["pending"] as? [[String: Any]] ?? [] }) {
                pendingByCat[p["c"] as? String ?? "plan", default: 0] += 1
            }
            let host: String? = O.hostTab != nil ? "app" : (live ? "term" : nil)
            let folder = (O.cwd as NSString).lastPathComponent
            let k0 = Int(now / 20_000)
            let spark = ((k0 - 29)...k0).map { O.spark[$0] ?? 0 }
            let flags = O.ctxMax > 0 && Double(O.ctx) / O.ctxMax > 0.8 ? ["ctx 80%+"] : [String]()
            var item: [String: Any] = [
                "id": O.id, "name": O.tool, "title": O.title.isEmpty ? folder : O.title, "lastPrompt": O.prompt, "cwd": cwdLabel(O.cwd), "branch": "",
                "tool": O.tool,
                "model": O.model.isEmpty ? O.tool : O.model, "effort": O.effort, "status": status, "live": live,
                "statusSince": live ? O.statusSince : O.endedAt, "cpu": O.cpu, "mem": O.mem, "kind": "", "entry": "",
                "firstTs": O.firstTs, "lastTs": O.lastTs, "ctx": O.ctx, "ctxMax": O.ctxMax, "turnMs": 0.0,
                "tok": O.tokDict, "cost": 0.0, "tools": O.tools, "errors": O.errors, "web": O.web, "prompts": O.prompts,
                "byCat": O.byCat, "pending": running.map { [$0.dict] } ?? [[String: Any]](),
                "spark": spark, "flags": flags, "agents": agents, "agentsRunning": agentsRunning,
            ]
            if let running { item["last"] = running.dict }
            item["waitingFor"] = orNull(waiting)
            item["tty"] = orNull(O.tty)
            item["pid"] = Int(O.pid)
            item["host"] = orNull(host)
            item["tab"] = orNull(O.hostTab)
            item["convId"] = orNull(O.convId)
            list.append(item)
            var brief = SessionBrief(id: O.id, name: O.tool, title: !O.title.isEmpty ? O.title : O.prompt.isEmpty ? folder : O.prompt, status: status, waitingFor: waiting,
                                     cwd: O.cwd, live: live, pid: O.pid, host: host, tab: O.hostTab, convId: O.convId)
            brief.model = O.model.isEmpty ? O.tool : O.model
            brief.effort = O.effort
            brief.ctx = O.ctx
            brief.ctxMax = O.ctxMax
            brief.tools = O.tools
            brief.web = O.web
            brief.errors = O.errors
            brief.spark = spark
            brief.agentsRunning = agentsRunning
            brief.statusSince = live ? O.statusSince : O.endedAt
            if let running {
                brief.actionName = running.n
                brief.actionCat = running.c
                brief.actionLabel = running.l
                brief.actionSince = running.t
            }
            briefs.append(brief)
        }
        list.sort {
            let a = Self.statusOrder[$0["status"] as? String ?? "ended"] ?? 3, b = Self.statusOrder[$1["status"] as? String ?? "ended"] ?? 3
            if a != b { return a < b }
            return ($0["lastTs"] as? Double ?? 0) > ($1["lastTs"] as? Double ?? 0)
        }

        let m0 = Int(now / Self.MIN)
        G.minutes = G.minutes.filter { $0.key >= m0 - 90 }
        var catSpark = Dictionary(uniqueKeysWithValues: CATS.map { ($0, [Int]()) })
        var toolSpark: [Int] = [], tokSpark: [Int] = [], costSpark: [Double] = []
        for k in (m0 - 29)...m0 {
            let b = G.minutes[k]
            toolSpark.append(b?.tools ?? 0)
            tokSpark.append(b?.tok ?? 0)
            costSpark.append(((b?.cost ?? 0) * 10_000).rounded() / 10_000)
            if k > m0 - 15 { for c in CATS { catSpark[c]!.append(b?.cats[c] ?? 0) } }
        }
        let last5 = { (a: [Int]) -> Double in Double(a.suffix(5).reduce(0, +)) / 5 }
        let cost15 = costSpark.suffix(15).reduce(0, +)

        // A collision: two chats wrote the file in the last 20 minutes. A chat and its own subagents are one chat (they
        // were taken for two), and `clash` names the chats, for their cards' ⚠.
        let files: [[String: Any]] = G.files.values
            .map { F -> (FileHeat, [String]) in (F, Set(F.editors.values.filter { now - $0.t < 20 * Self.MIN }.map(\.s)).sorted()) }
            .sorted { a, b in
                let ca = a.1.count > 1, cb = b.1.count > 1
                if ca != cb { return ca }
                let wa = a.0.w * 3 + a.0.r, wb = b.0.w * 3 + b.0.r
                return wa != wb ? wa > wb : a.0.last > b.0.last
            }
            .prefix(14)
            .map { pair -> [String: Any] in
                let F = pair.0, clash = pair.1.count > 1 ? pair.1 : []
                let editors: [[String: Any]] = F.editors.values.map { ["s": $0.s, "a": orNull($0.a)] }
                return ["p": tildify(F.p), "short": shortPath(F.p), "r": F.r, "w": F.w, "last": F.last, "collision": !clash.isEmpty,
                        "clash": clash, "editors": editors]
            }

        let promptTok = Double(G.tokIn + G.tokCr + G.tokCw)
        // The other AI tools' chats and subagents count too, also once they're gone from the list.
        for O in others.values where O.lastTs >= day0 && (O.tools > 0 || O.prompts > 0) {
            otherChatsToday.insert(O.id)
            for a in O.agents where (a["lastTs"] as? Double ?? 0) >= day0 && (a["tools"] as? Int ?? 0) > 0 {
                otherAgentsToday.insert("\(O.id):\(a["id"] as? String ?? "")")
            }
        }
        let sessionsToday = sessions.values.filter { $0.lastTs >= day0 && ($0.tools > 0 || $0.prompts > 0) }.count + otherChatsToday.count
        let agentsToday = agents.values.filter { $0.lastTs >= day0 && $0.tools > 0 }.count + otherAgentsToday.count
        let agentCost = agents.values.reduce(0) { $0 + $1.cost }
        let totals: [String: Any] = [
            "live": list.filter { ($0["live"] as? Bool) == true }.count, "sessionsToday": sessionsToday, "agentsToday": agentsToday,
            "runningAgents": runningAgents, "cost": G.cost, "saved": G.saved,
            "tok": ["in": G.tokIn, "out": G.tokOut, "cr": G.tokCr, "cw": G.tokCw],
            "tools": G.tools, "errors": G.errors, "web": G.web, "prompts": G.prompts,
            "cacheHit": promptTok > 0 ? Double(G.tokCr) / promptTok : 0,
            "okRate": G.tools > 0 ? Double(G.tools - G.errors) / Double(G.tools) : 1,
            "avgTurn": G.turns > 0 ? G.turnMs / Double(G.turns) : 0, "turns": G.turns,
            "toolsPerMin": last5(toolSpark), "tokPerMin": last5(tokSpark), "costPerHour": cost15 * 4,
            "agentShare": G.cost > 0 ? agentCost / G.cost : 0,
        ]
        let json: [String: Any] = [
            "day0": day0, "booted": booted, "app": true,
            "sessions": list, "totals": totals,
            "byCat": G.byCat, "lastByCat": G.lastByCat, "pendingByCat": pendingByCat, "catSpark": catSpark,
            "toolSpark": toolSpark, "tokSpark": tokSpark, "costSpark": costSpark,
            "byModel": G.byModel.values.sorted { $0.cost > $1.cost }.map {
                ["model": $0.model, "tool": $0.tool, "priced": $0.priced, "cost": $0.cost, "calls": $0.calls,
                 "tok": ["in": $0.tokIn, "out": $0.tokOut, "cr": $0.tokCr, "cw": $0.tokCw]] as [String: Any]
            },
            "research": Array(G.research.suffix(30).reversed()),
            "shells": Array(G.shells.suffix(14).reversed()),
            "ticker": Array(G.ticker.suffix(200)),
            "files": files,
        ]
        var out = json
        if let st = fileStat(Limits.path) {
            if st.mtime != limits.mtime { limits = (st.mtime, Limits.parse(mtime: st.mtime)) }
        } else {
            limits = (-1, nil)
        }
        out["limits"] = limits.json ?? NSNull()
        // Every AI's usage limits for the top bar, in its order, whichever chat is in front: Claude's from its status
        // line, Codex's and Antigravity's as last read, Antigravity's a column per group in use (AgyUsage.pools). One not
        // heard from in a week is left out.
        var limitsByAI: [[String: Any]] = []
        var pools: [(tool: String, value: [String: Any]?)] = [("Claude Code", limits.json?.merging(["id": "claude", "name": "claude"]) { $1 }),
                                                             ("Codex", codexUsage?.merging(["id": "codex", "name": "codex"]) { $1 })]
        pools += (agyUsage.map { AgyUsage.pools($0, model: agyModel) } ?? []).map { ("Antigravity", $0) }
        for (tool, value) in pools {
            guard var v = value, now - ((v["at"] as? NSNumber)?.doubleValue ?? 0) < 7 * 24 * 3_600_000 else { continue }
            v["tool"] = tool
            limitsByAI.append(v)
        }
        out["limitsByAI"] = limitsByAI
        return (out, briefs)
    }

    // MARK: publishing

    private func encode(_ obj: Any) -> String? {
        guard JSONSerialization.isValidJSONObject(obj), let data = try? JSONSerialization.data(withJSONObject: obj) else {
            NSLog("atalay-terminal: snapshot is not valid JSON")
            return nil
        }
        return String(decoding: data, as: UTF8.self)
    }

    private func sendInit() {
        initWanted = false
        let snap = snapshot()
        guard let js = encode(["state": snap.json, "log": log.suffix(160).map(\.dict)]) else { return }
        DispatchQueue.main.async {
            self.onInit?(js)
            self.onState?("", snap.briefs)
        }
    }

    /// Builds and sends the state when something changed (and every few seconds for the time-based
    /// figures), and skips the main thread and the page entirely when the result is identical.
    private func publishState() {
        let now = nowMs()
        guard stateDirty || now - lastStateAt > 5000 else { return }
        stateDirty = false
        lastStateAt = now
        let snap = snapshot()
        guard let js = encode(snap.json), js != lastStateJSON else { return }
        lastStateJSON = js
        DispatchQueue.main.async { self.onState?(js, snap.briefs) }
    }

    private func flushEvents() {
        guard !outbox.isEmpty else { return }
        let batch = outbox
        outbox.removeAll()
        let native: [NativeEvent] = batch.compactMap { e in
            guard let k = e["k"] as? String, let sid = e["s"] as? String,
                  ["tool", "result", "prompt", "say", "sys", "usage"].contains(k), e["a"] == nil else { return nil }
            var label = e["l"] as? String ?? ""
            if k == "usage" { label = "+\(int(e["out"])) out" }
            return NativeEvent(sid: sid, id: e["id"] as? String, kind: k, cat: e["c"] as? String, name: e["n"] as? String,
                               label: label, ok: e["ok"] as? Bool, dur: e["d"] as? Double, meta: e["m"] as? String ?? "")
        }
        guard let js = encode(batch) else { return }
        DispatchQueue.main.async {
            self.onEvents?(js)
            if !native.isEmpty { self.onNativeEvents?(native) }
        }
    }

    /// Folders where Claude chats ran, newest first (for the folder picker's "recent" list).
    func recentFolders(_ limit: Int, completion: @escaping ([(path: String, t: Double)]) -> Void) {
        queue.async {
            var seen = Set<String>()
            var out: [(String, Double)] = []
            for item in self.history.values.sorted(by: { $0.mtime > $1.mtime }) where !item.cwd.isEmpty && !seen.contains(item.cwd) {
                seen.insert(item.cwd)
                var isDir: ObjCBool = false
                if FileManager.default.fileExists(atPath: item.cwd, isDirectory: &isDir), isDir.boolValue { out.append((item.cwd, item.mtime)) }
                if out.count >= limit { break }
            }
            DispatchQueue.main.async { completion(out) }
        }
    }

    /// For Source Control (Git.swift): today's sessions and where they work, and the files they wrote today with the
    /// sessions that wrote each. Called back on the engine's queue.
    func gitSources(_ completion: @escaping ([GitSession], [String: [String]]) -> Void) {
        queue.async {
            let now = nowMs()
            let list = self.sessions.values.filter { !$0.cwd.isEmpty && ($0.live || $0.lastTs >= self.day0) }.map { S in
                GitSession(id: S.id, name: self.displayName(S), title: S.title, status: self.statusOf(S, now), live: S.live, cwd: S.cwd)
            }
            var written: [String: [String]] = [:]
            for F in self.G.files.values where F.w > 0 {
                var ids: [String] = []
                for e in F.editors.values where !ids.contains(e.s) { ids.append(e.s) }
                written[F.p] = ids
            }
            completion(list, written)
        }
    }

    // MARK: history (sidebar)

    private func scanHistory(force: Bool) {
        guard let dirs = try? FileManager.default.contentsOfDirectory(atPath: projects) else { return }
        var changed = force
        var present = Set<String>()
        for d in dirs {
            let dir = (projects as NSString).appendingPathComponent(d)
            guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { continue }
            for n in names where n.hasSuffix(".jsonl") {
                let path = (dir as NSString).appendingPathComponent(n)
                let sid = (n as NSString).deletingPathExtension
                present.insert(sid)
                guard let st = fileStat(path) else { continue }
                if let old = history[sid], old.mtime == st.mtime, old.size == Int(st.size) { continue }
                var item = history[sid] ?? ChatItem(id: sid, path: path, cwd: "", mtime: 0, size: 0, title: "", lastPrompt: "")
                item.path = path
                item.mtime = st.mtime
                item.size = Int(st.size)
                readTail(&item)
                history[sid] = item
                changed = true
            }
        }
        for sid in history.keys where !present.contains(sid) && history[sid]?.tool != "antigravity" {
            history.removeValue(forKey: sid)
            changed = true
        }
        // Scan Antigravity conversations from its SQLite database and merge into the same list.
        changed = scanAgyHistory(present: &present) || changed
        guard changed else { return }
        let items = history.values
            .filter { !$0.cwd.isEmpty && (!$0.title.isEmpty || !$0.lastPrompt.isEmpty) }
            .sorted { $0.mtime > $1.mtime }
        DispatchQueue.main.async { self.onHistory?(items) }
    }

    /// Reads Antigravity's conversation_summaries.db and upserts items into `history`.
    /// Returns true when anything changed. `present` is updated with every agy id seen so stale ones are pruned.
    private func scanAgyHistory(present: inout Set<String>) -> Bool {
        let agyRoot = HOME + "/.gemini/antigravity-cli"
        let dbPath = agyRoot + "/conversation_summaries.db"
        guard let db = Self.agyOpen(dbPath) else { return false }
        defer { sqlite3_close(db) }
        var changed = false
        // Fallback folder map from cache/last_conversations.json (folder -> conversation_id) when workspace_uris is empty.
        var lastByConv: [String: String] = [:]
        if let data = FileManager.default.contents(atPath: agyRoot + "/cache/last_conversations.json"),
           let last = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            for case let (dir, cid as String) in last { lastByConv[cid] = dir }
        }
        // Top-level CLI conversations only (nesting_depth = 0); skip the desktop-app's own UI conversations.
        // Older CLIs' lists may not have app_data_dir, so fall back to nesting_depth = 0.
        var rows: [(id: String, title: String, preview: String, mtime: Double, uriJson: String)] = []
        for filter in ["nesting_depth = 0 AND IFNULL(app_data_dir, '') != 'antigravity'", "nesting_depth = 0"] {
            var read = false
            let sql = "SELECT conversation_id, title, preview, last_modified_time, last_user_input_time, workspace_uris " +
                      "FROM conversation_summaries WHERE \(filter) ORDER BY last_modified_time DESC LIMIT 200"
            Self.agyRows(db, sql) { col in
                rows.append((col(0), col(1), col(2), parseISO(col(3)), col(5)))
                return true
            } done: { read = $0 }
            if read { break }
        }
        for row in rows {
            let id = row.id
            guard !id.isEmpty else { continue }
            present.insert(id)
            // Parse cwd from workspace_uris: a JSON array of "file:///absolute/path" strings; fall back to last_conversations.json.
            var cwd = ""
            if let data = row.uriJson.data(using: .utf8),
               let arr = try? JSONSerialization.jsonObject(with: data) as? [String],
               let first = arr.first,
               let url = URL(string: first), url.isFileURL {
                cwd = url.path
            } else if let dir = lastByConv[id] {
                cwd = dir
            }
            guard !cwd.isEmpty else { continue }
            cwd = URL(fileURLWithPath: cwd).standardizedFileURL.path
            let tPath = "\(agyRoot)/brain/\(id)/.system_generated/logs/transcript.jsonl"
            let tStat = fileStat(tPath) ?? fileStat("\(agyRoot)/conversations/\(id).db")
            let size = Int(tStat?.size ?? 0)
            let mtime = max(row.mtime, tStat?.mtime ?? 0)
            // Only update when mtime or transcript size changed.
            if let old = history[id], old.mtime == mtime, old.size == size { continue }
            var item = history[id] ?? ChatItem(id: id, path: tPath, cwd: cwd, mtime: 0, size: 0, title: "", lastPrompt: "", tool: "antigravity")
            item.path = tPath
            item.mtime = mtime
            item.size = size
            item.cwd = cwd
            item.title = clip(row.title, 90)
            var lastPrompt = clip(row.preview, 160)
            if let fh = FileHandle(forReadingAtPath: tPath), let tSize = tStat?.size, tSize > 0 {
                defer { try? fh.close() }
                let readBytes = Int(min(tSize, 65_536))
                try? fh.seek(toOffset: tSize - UInt64(readBytes))
                if let data = try? fh.read(upToCount: readBytes) {
                    for line in data.split(separator: 10).reversed() {
                        if let rec = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any],
                           rec["type"] as? String == "USER_INPUT" {
                            let q = Self.agyRequest(rec["content"] as? String ?? "")
                            if !q.isEmpty {
                                lastPrompt = clip(q, 160)
                                break
                            }
                        }
                    }
                }
            }
            item.lastPrompt = lastPrompt
            item.tool = "antigravity"
            history[id] = item
            changed = true
        }
        // Remove stale agy items whose conversation was deleted from the DB.
        for sid in history.keys where history[sid]?.tool == "antigravity" && !present.contains(sid) {
            history.removeValue(forKey: sid)
            changed = true
        }
        return changed
    }

    private func readTail(_ item: inout ChatItem) {
        guard let fh = FileHandle(forReadingAtPath: item.path) else { return }
        defer { try? fh.close() }
        let size = UInt64(item.size)
        func lines(from: UInt64, count: Int) -> [Data] {
            try? fh.seek(toOffset: from)
            guard let data = try? fh.read(upToCount: count) else { return [] }
            var parts = data.split(separator: 10, omittingEmptySubsequences: true)
            if from > 0, !parts.isEmpty { parts.removeFirst() }
            return parts.map { Data($0) }
        }
        func scan(_ ls: [Data]) {
            for line in ls.reversed() {
                if !item.title.isEmpty, !item.lastPrompt.isEmpty, !item.cwd.isEmpty { return }
                let head = line.prefix(800)
                let isTitle = head.range(of: Data("\"type\":\"ai-title\"".utf8)) != nil
                let isPrompt = head.range(of: Data("\"type\":\"last-prompt\"".utf8)) != nil
                let hasCwd = item.cwd.isEmpty && head.range(of: Data("\"cwd\":\"".utf8)) != nil
                guard isTitle || isPrompt || hasCwd, let rec = try? JSONSerialization.jsonObject(with: line) as? [String: Any] else { continue }
                if isTitle, item.title.isEmpty, let t = rec["aiTitle"] as? String { item.title = clip(t, 90) }
                if isPrompt, item.lastPrompt.isEmpty, let p = rec["lastPrompt"] as? String { item.lastPrompt = clip(p, 160) }
                if item.cwd.isEmpty, let c = rec["cwd"] as? String { item.cwd = c }
            }
        }
        item.title = ""
        item.lastPrompt = ""
        // The first record's cwd is where the chat started; `claude --resume` must run from there,
        // later records follow any `cd` the session made. A resumed or compacted conversation can open with records
        // that have none (a long summary, file snapshots), well past the first 64 KB: the head is read in steps, up to
        // 8 MB, until a record with a cwd turns up. Stopping short made the chat resume in its last folder instead.
        item.cwd = ""
        var offset: UInt64 = 0
        var rest = Data()
        while item.cwd.isEmpty, offset < min(size, 8 << 20) {
            try? fh.seek(toOffset: offset)
            guard let chunk = try? fh.read(upToCount: 256 << 10), !chunk.isEmpty else { break }
            offset += UInt64(chunk.count)
            let data = rest + chunk
            guard let nl = data.lastIndex(of: 10) else {
                rest = data
                continue
            }
            rest = Data(data[data.index(after: nl)...])
            for line in data[..<nl].split(separator: 10) where line.prefix(800).range(of: Data("\"cwd\":\"".utf8)) != nil {
                if let rec = try? JSONSerialization.jsonObject(with: Data(line)) as? [String: Any], let cwd = rec["cwd"] as? String {
                    item.cwd = cwd
                    break
                }
            }
        }
        scan(lines(from: size > 96 << 10 ? size - (96 << 10) : 0, count: 96 << 10))
        if item.title.isEmpty && item.lastPrompt.isEmpty, size > 96 << 10 {
            scan(lines(from: 0, count: 96 << 10))
        }
    }
}
