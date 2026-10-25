import CoreServices
import Foundation

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
    private var historyPending = false
    private var flushPending = false
    private var stateDirty = true
    private var lastStateJSON = ""
    private var lastStateAt = 0.0
    private var cpuSeen: [Int32: (ns: UInt64, at: Double)] = [:]

    init() {
        claudeDir = ProcessInfo.processInfo.environment["CLAUDE_CONFIG_DIR"] ?? (HOME as NSString).appendingPathComponent(".claude")
        projects = (claudeDir as NSString).appendingPathComponent("projects")
        registry = (claudeDir as NSString).appendingPathComponent("sessions")
    }

    // MARK: public API (any thread)

    /// The first index is what the dashboard waits for, so it runs as user-initiated work and keeps App Nap
    /// off until it is done (napping, a background app's utility-priority reads crawled for minutes).
    /// Everything after it runs at utility priority, which macOS keeps on the efficiency cores.
    func start() {
        Limits.installScript()
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
        every(60) { self.maybeNewDay() }
        every(1) { self.publishState() }
    }

    private func every(_ seconds: Double, _ block: @escaping () -> Void) {
        let t = DispatchSource.makeTimerSource(queue: queue)
        t.schedule(deadline: .now() + seconds, repeating: seconds, leeway: .milliseconds(Int(max(50, seconds * 100))))
        t.setEventHandler(handler: block)
        t.resume()
        timers.append(t)
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

    private func historyChanged() {
        guard !historyPending else { return }
        historyPending = true
        queue.asyncAfter(deadline: .now() + 8, qos: .background) {
            self.historyPending = false
            self.scanHistory(force: false)
        }
    }

    private func startWatch() {
        var ctx = FSEventStreamContext(version: 0, info: Unmanaged.passUnretained(self).toOpaque(), retain: nil, release: nil, copyDescription: nil)
        let callback: FSEventStreamCallback = { _, info, _, paths, _, _ in
            guard let info else { return }
            let engine = Unmanaged<RadarEngine>.fromOpaque(info).takeUnretainedValue()
            let list = unsafeBitCast(paths, to: NSArray.self)
            for case let p as String in list {
                if p.hasSuffix(".jsonl") {
                    if engine.cursors[p] == nil { engine.historyChanged() }
                    engine.pump(p)
                } else if p.hasPrefix(engine.registry) {
                    engine.registryChanged()
                }
            }
        }
        let flags = UInt32(kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagUseCFTypes | kFSEventStreamCreateFlagNoDefer)
        guard let s = FSEventStreamCreate(nil, callback, &ctx, [projects, registry] as CFArray,
                                          FSEventStreamEventId(kFSEventStreamEventIdSinceNow), 0.2, flags) else { return }
        FSEventStreamSetDispatchQueue(s, queue)
        FSEventStreamStart(s)
        stream = s
    }

    private func maybeNewDay() {
        let d = dayStart()
        guard d != day0 else { return }
        day0 = d
        G = Globals()
        seenMsg.removeAll()
        recOwner.removeAll()
        for S in sessions.values { S.resetCounters() }
        for A in agents.values { A.resetCounters() }
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
        var e = extra
        e["k"] = k
        e["t"] = ts
        e["s"] = S.id
        if let A { e["a"] = A.id }
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
                S.ctxMax = priceFor(model)?.ctx ?? 0
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
        if let file = sm.file { touchFile(file, name, S, A, ts) }
        if name == "Agent" || name == "Task", let input = b["input"] as? [String: Any] {
            agentHints[id] = (clip(input["description"] as? String, 70), input["subagent_type"] as? String ?? "")
        }
        emit(ev("tool", ts, S, A, ["id": id, "n": name, "c": c, "l": sm.label]), today)
    }

    private func touchFile(_ fp: String, _ name: String, _ S: Session, _ A: SubAgent?, _ ts: Double) {
        let F = G.files[fp] ?? FileHeat(p: fp)
        G.files[fp] = F
        if name == "Read" || name == "NotebookRead" {
            F.r += 1
        } else {
            F.w += 1
            F.editors[A.map { "\(S.id):\($0.id)" } ?? S.id] = (ts, S.id, A?.id)
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

    private func fileStat(_ path: String) -> (size: UInt64, mtime: Double)? {
        var st = stat()
        guard stat(path, &st) == 0 else { return nil }
        return (UInt64(st.st_size), Double(st.st_mtimespec.tv_sec) * 1000 + Double(st.st_mtimespec.tv_nsec) / 1e6)
    }

    /// Binary search for the byte offset where records reach `since`, so huge transcripts load fast.
    private func seekTime(_ path: String, _ size: UInt64, _ since: Double) -> UInt64 {
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
    private static func withoutImages(_ line: Data) -> Data {
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
                c.off = seekTime(fp, st.size, day0 - 10 * Self.MIN)
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
        }
        cpuSeen = cpuSeen.filter { alivePids.contains($0.key) }
        matchTabs()
    }

    private func matchTabs() {
        for S in sessions.values {
            let tab = S.live ? S.ppid.flatMap { appShells[$0] } : nil
            if tab != S.hostTab { stateDirty = true }
            S.hostTab = tab
        }
    }

    // MARK: snapshot

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
                "id": S.id, "name": S.name.isEmpty ? clip(((S.cwd as NSString).lastPathComponent) + "-" + S.id.prefix(2), 24) : S.name,
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

        let files: [[String: Any]] = G.files.values
            .map { F -> (FileHeat, Bool) in (F, F.editors.values.filter { now - $0.t < 20 * Self.MIN }.count > 1) }
            .sorted { a, b in
                if a.1 != b.1 { return a.1 }
                let wa = a.0.w * 3 + a.0.r, wb = b.0.w * 3 + b.0.r
                return wa != wb ? wa > wb : a.0.last > b.0.last
            }
            .prefix(14)
            .map { pair -> [String: Any] in
                let F = pair.0
                let editors: [[String: Any]] = F.editors.values.map { ["s": $0.s, "a": orNull($0.a)] }
                return ["p": tildify(F.p), "short": shortPath(F.p), "r": F.r, "w": F.w, "last": F.last, "collision": pair.1, "editors": editors]
            }

        let promptTok = Double(G.tokIn + G.tokCr + G.tokCw)
        let sessionsToday = sessions.values.filter { $0.lastTs >= day0 && ($0.tools > 0 || $0.prompts > 0) }.count
        let agentsToday = agents.values.filter { $0.lastTs >= day0 && $0.tools > 0 }.count
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
                ["model": $0.model, "priced": $0.priced, "cost": $0.cost, "calls": $0.calls,
                 "tok": ["in": $0.tokIn, "out": $0.tokOut, "cr": $0.tokCr, "cw": $0.tokCw]] as [String: Any]
            },
            "research": Array(G.research.suffix(30).reversed()),
            "shells": Array(G.shells.suffix(14).reversed()),
            "ticker": Array(G.ticker.suffix(200)),
            "files": files,
        ]
        var out = json
        if let st = fileStat(Limits.path), st.mtime != limits.mtime { limits = (st.mtime, Limits.parse(mtime: st.mtime)) }
        out["limits"] = limits.json ?? NSNull()
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
        for sid in history.keys where !present.contains(sid) {
            history.removeValue(forKey: sid)
            changed = true
        }
        guard changed else { return }
        let items = history.values
            .filter { !$0.cwd.isEmpty && (!$0.title.isEmpty || !$0.lastPrompt.isEmpty) }
            .sorted { $0.mtime > $1.mtime }
        DispatchQueue.main.async { self.onHistory?(items) }
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
        // later records follow any `cd` the session made.
        item.cwd = ""
        for line in lines(from: 0, count: 64 << 10) where line.prefix(800).range(of: Data("\"cwd\":\"".utf8)) != nil {
            if let rec = try? JSONSerialization.jsonObject(with: line) as? [String: Any], let cwd = rec["cwd"] as? String {
                item.cwd = cwd
                break
            }
        }
        scan(lines(from: size > 96 << 10 ? size - (96 << 10) : 0, count: 96 << 10))
        if item.title.isEmpty && item.lastPrompt.isEmpty, size > 96 << 10 {
            scan(lines(from: 0, count: 96 << 10))
        }
    }
}
