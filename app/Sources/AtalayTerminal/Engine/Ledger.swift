import Foundation

/// The spend ledger: what Claude Code cost (at API list prices, as the rest of the dashboard counts it) by day, project
/// and model, kept by the app. Claude Code deletes transcripts after 30 days (its `cleanupPeriodDays`), so anything older
/// lives only here. The days before today are read from the transcripts once and then frozen: never read again, so a
/// transcript Claude deletes later takes nothing away, and a day it has half deleted isn't counted short. Today comes
/// live from the engine. Kept on this Mac only, like everything else the dashboard reads.
///
/// Used on the engine's queue, except `scan`, which reads the transcripts on a queue of its own.
final class Ledger {
    struct Agg: Codable {
        var cost = 0.0, tokIn = 0, tokOut = 0, cr = 0, cw = 0, calls = 0

        enum CodingKeys: String, CodingKey {
            case cost = "c", tokIn = "i", tokOut = "o", cr = "r", cw = "w", calls = "n"
        }

        mutating func add(cost c: Double, _ i: Int, _ o: Int, _ r: Int, _ w: Int) {
            cost += c
            tokIn += i; tokOut += o; cr += r; cw += w
            calls += 1
        }

        mutating func add(_ o: Agg) {
            cost += o.cost
            tokIn += o.tokIn; tokOut += o.tokOut; cr += o.cr; cw += o.cw
            calls += o.calls
        }
    }

    /// Project folder (where the chat started) -> model -> totals.
    typealias Day = [String: [String: Agg]]
    /// "2026-11-05" (the local day) -> that day's spend.
    typealias Days = [String: Day]

    private struct Book: Codable {
        var version = 1
        /// The last day read and frozen ("2026-11-05").
        var frozenThrough: String?
        var days: Days = [:]
    }

    private var book = Book()
    private let url: URL
    /// The day that just ended, from the engine's own counters, until the transcripts are read for it a few minutes later.
    private var provisional: Days = [:]
    /// The transcripts are being read for the days not frozen yet (the first time: all of them).
    private(set) var reading = false

    /// Gregorian whatever the user's calendar is, so the days' keys read the same everywhere; weeks start on Monday, as
    /// the leaderboard's do.
    static let calendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = .current
        c.firstWeekday = 2
        return c
    }()

    init() {
        let base = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        // Each build keeps its own, as its sessions (Detached.prefix): a demo run reads demo transcripts.
        url = base.appendingPathComponent(Detached.prefix == "atl-" ? "ledger.json" : "ledger-\(Detached.prefix.dropLast()).json")
        if let data = try? Data(contentsOf: url), let saved = try? JSONDecoder().decode(Book.self, from: data), saved.version == 1 {
            book = saved
        }
    }

    // MARK: freezing days

    /// Starts reading the days not frozen yet, up to today's start: the time span to read from the transcripts (`scan`),
    /// then `freeze` what it found. Nil when every day before today is frozen, or a reading is under way.
    func beginReading(before day0: Double) -> (from: Double, to: Double)? {
        guard !reading else { return nil }
        // The first time, everything the transcripts still have.
        let from = book.frozenThrough.flatMap(Self.date(ofKey:)).flatMap { Self.calendar.date(byAdding: .day, value: 1, to: $0) }
            .map { $0.timeIntervalSince1970 * 1000 } ?? 0
        guard from < day0 else { return nil }
        reading = true
        return (from, day0)
    }

    /// The days read for `beginReading`'s span, frozen: a day frozen already stays as it was.
    func freeze(_ days: Days, through to: Double) {
        reading = false
        for (key, day) in days where book.days[key] == nil { book.days[key] = day }
        let last = Self.key(to - 1)
        book.frozenThrough = max(book.frozenThrough ?? "", last)
        provisional = provisional.filter { $0.key > last }
        save()
    }

    /// The day that just ended, as the engine counted it, shown until the transcripts are read for it.
    func holdProvisional(_ day: Day, at dayStart: Double) {
        guard !day.isEmpty else { return }
        provisional[Self.key(dayStart)] = day
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(book) else { return }
        try? data.write(to: url, options: .atomic)
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
    }

    // MARK: reading the transcripts

    private static let assistantKey = Array("\"type\":\"assistant\"".utf8)

    /// Spend in [from, to) from every transcript changed since `from`, by day, project and model. Each API reply counts
    /// once, however many records or transcripts repeat it (a reply streamed over several records, forks and resumed
    /// chats that copy the history), as the engine counts it.
    static func scan(projects: String, from: Double, to: Double) -> Days {
        var files: [(path: String, sid: String?, agent: Bool, born: Date)] = []
        func walk(_ dir: String, _ rel: [String]) {
            guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { return }
            for n in names {
                let p = (dir as NSString).appendingPathComponent(n)
                if n.hasSuffix(".jsonl") {
                    var st = stat()
                    guard stat(p, &st) == 0, Double(st.st_mtimespec.tv_sec) * 1000 >= from - 1000 else { continue }
                    let born = Date(timeIntervalSince1970: Double(st.st_birthtimespec.tv_sec))
                    // <project>/<session>.jsonl, or a subagent's under <project>/<session>/…
                    if rel.count == 1 {
                        files.append((p, (n as NSString).deletingPathExtension, false, born))
                    } else if rel.count >= 2 {
                        files.append((p, rel[1], true, born))
                    }
                } else if rel.count < 6, n != "memory", !n.contains(".") {
                    var isDir: ObjCBool = false
                    if FileManager.default.fileExists(atPath: p, isDirectory: &isDir), isDir.boolValue { walk(p, rel + [n]) }
                }
            }
        }
        walk(projects, [])
        // The chats before their subagents (whose project is their chat's), each oldest first, so copied history is
        // credited where it was made.
        files.sort { a, b in a.agent != b.agent ? !a.agent : a.born < b.born }

        var days: Days = [:]
        var seen = Set<String>()
        var cwdOf: [String: String] = [:]
        var keys = DayKeys()
        for f in files {
            var cwd: String? = f.agent ? f.sid.flatMap { cwdOf[$0] } : nil
            forEachLine(f.path, from: from) { line in
                guard line.withUnsafeBytes({ raw in
                    raw.baseAddress.map { memmem($0, raw.count, assistantKey, assistantKey.count) != nil } ?? false
                }), let rec = try? JSONSerialization.jsonObject(with: RadarEngine.withoutImages(line)) as? [String: Any],
                rec["type"] as? String == "assistant" else { return }
                if cwd == nil, let c = rec["cwd"] as? String { cwd = c }
                let ts = parseISO(rec["timestamp"] as? String)
                guard ts >= from, ts < to, (rec["isApiErrorMessage"] as? Bool) != true,
                      let m = rec["message"] as? [String: Any], let u = m["usage"] as? [String: Any],
                      let mid = m["id"] as? String else { return }
                let model = m["model"] as? String
                guard model != "<synthetic>", seen.insert(mid).inserted else { return }
                let mk = shortModel(model).isEmpty ? "?" : shortModel(model)
                days[keys.key(ts), default: [:]][cwd ?? "", default: [:]][mk, default: Agg()]
                    .add(cost: costOf(model, u), int(u["input_tokens"]), int(u["output_tokens"]),
                         int(u["cache_read_input_tokens"]), int(u["cache_creation_input_tokens"]))
            }
            if !f.agent, let sid = f.sid, let cwd { cwdOf[sid] = cwd }
        }
        return days
    }

    /// Each line of a transcript, without copying it; a big one starts near `from` (found by its timestamps).
    private static func forEachLine(_ path: String, from: Double, _ body: (Data) -> Void) {
        guard let fh = FileHandle(forReadingAtPath: path) else { return }
        defer { try? fh.close() }
        var st = stat()
        guard stat(path, &st) == 0 else { return }
        let size = UInt64(st.st_size)
        var pos: UInt64 = 0
        var skipLine = false
        if from > 0, size > 8 << 20 {
            pos = RadarEngine.seekTime(path, size, from - 10 * 60_000)
            skipLine = pos > 0
        }
        try? fh.seek(toOffset: pos)
        var rest = Data()
        while pos < size {
            guard let chunk = try? fh.read(upToCount: Int(min(UInt64(4 << 20), size - pos))), !chunk.isEmpty else { break }
            pos += UInt64(chunk.count)
            var data = rest.isEmpty ? chunk : rest + chunk
            rest = Data()
            if skipLine {
                guard let nl = data.firstIndex(of: 10) else { continue }
                data = data[(nl + 1)...]
                skipLine = false
            }
            guard let lastNL = data.lastIndex(of: 10) else {
                rest = Data(data)
                continue
            }
            rest = Data(data[(lastNL + 1)...])
            data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
                guard let base = raw.baseAddress else { return }
                let end = lastNL - data.startIndex
                var off = 0
                while off < end {
                    let nl = memchr(base + off, 10, end - off).map { base.distance(to: UnsafeRawPointer($0)) } ?? end
                    if nl > off {
                        body(Data(bytesNoCopy: UnsafeMutableRawPointer(mutating: base + off), count: nl - off, deallocator: .none))
                    }
                    off = nl + 1
                }
            }
        }
    }

    // MARK: days

    /// A timestamp's day key, the last day remembered (records come in order, so it rarely changes).
    struct DayKeys {
        private var lo = 0.0, hi = -1.0, last = ""

        mutating func key(_ ms: Double) -> String {
            if ms >= lo, ms < hi { return last }
            let start = Ledger.calendar.startOfDay(for: Date(timeIntervalSince1970: ms / 1000))
            let end = Ledger.calendar.date(byAdding: .day, value: 1, to: start) ?? start.addingTimeInterval(86_400)
            lo = start.timeIntervalSince1970 * 1000
            hi = end.timeIntervalSince1970 * 1000
            last = Ledger.key(start)
            return last
        }
    }

    static func key(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    static func key(_ ms: Double) -> String { key(Date(timeIntervalSince1970: ms / 1000)) }

    static func date(ofKey key: String) -> Date? {
        let p = key.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
    }

    // MARK: the dashboard's question

    /// The spend panel's history (web/app.js): the last 7 or 30 days, 12 weeks or 12 months up to today (today's figures
    /// live, `today`), by project: a project is a git repo (a chat in one of its folders or worktrees counts there), else
    /// the folder. The `top` projects that cost most, the rest as one.
    func summary(range: String, day0: Double, today: Day, top: Int = 4) -> [String: Any] {
        let cal = Self.calendar
        let todayDate = Date(timeIntervalSince1970: day0 / 1000)
        let (unit, count): (Calendar.Component, Int) = switch range {
        case "7d": (.day, 7)
        case "12w": (.weekOfYear, 12)
        case "12m": (.month, 12)
        default: (.day, 30)
        }
        let current = cal.dateInterval(of: unit, for: todayDate)?.start ?? todayDate
        let starts = (0..<count).reversed().compactMap { cal.date(byAdding: unit, value: -$0, to: current) }
        guard let first = starts.first else { return [:] }

        var all = book.days
        for (k, v) in provisional where all[k] == nil { all[k] = v }
        all[Self.key(todayDate)] = today

        struct Project { var cost = 0.0, byModel: [String: Double] = [:], series: [Double] }
        var projects: [String: Project] = [:]
        var byModel: [String: Agg] = [:]
        var totals = [Double](repeating: 0, count: starts.count)
        var roots: [String: String] = [:]
        var day = first, b = 0
        while day <= todayDate {
            while b + 1 < starts.count, day >= starts[b + 1] { b += 1 }
            for (cwd, models) in all[Self.key(day)] ?? [:] {
                let root = roots[cwd] ?? Self.repoRoot(of: cwd)
                roots[cwd] = root
                var p = projects[root] ?? Project(series: [Double](repeating: 0, count: starts.count))
                for (model, a) in models {
                    p.cost += a.cost
                    p.byModel[model, default: 0] += a.cost
                    byModel[model, default: Agg()].add(a)
                    p.series[b] += a.cost
                    totals[b] += a.cost
                }
                projects[root] = p
            }
            guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }

        let total = totals.reduce(0, +)
        var ranked = projects.filter { $0.value.cost > 0 }.sorted { $0.value.cost > $1.value.cost }
        var rest: Project?
        if ranked.count > top + 1 {
            var other = Project(series: [Double](repeating: 0, count: starts.count))
            for (_, p) in ranked[top...] {
                other.cost += p.cost
                for i in other.series.indices { other.series[i] += p.series[i] }
            }
            rest = other
            ranked = Array(ranked[..<top])
        }
        let names = distinctLabels(for: ranked.map(\.key).filter { !$0.isEmpty }, parts: 1)
        let round = { (v: Double) in (v * 10_000).rounded() / 10_000 }
        var list: [[String: Any]] = ranked.map { root, p in
            [
                "id": root, "label": root.isEmpty ? "unknown folder" : names[root] ?? projectLabel(root), "path": tildify(root),
                "cost": round(p.cost), "share": total > 0 ? p.cost / total : 0,
                "model": p.byModel.max { $0.value < $1.value }?.key ?? "", "series": p.series.map(round),
            ]
        }
        if let rest {
            list.append(["id": "*", "label": "other", "path": "", "cost": round(rest.cost), "share": total > 0 ? rest.cost / total : 0,
                         "model": "", "series": rest.series.map(round)])
        }
        // Every model's total over the span, the costliest first (one without a list price costs 0 and says so).
        let models: [[String: Any]] = byModel.filter { $0.value.calls > 0 }
            .sorted { $0.value.cost != $1.value.cost ? $0.value.cost > $1.value.cost : $0.value.calls > $1.value.calls }
            .map { model, a in
                ["model": model, "cost": round(a.cost), "share": total > 0 ? a.cost / total : 0, "calls": a.calls, "out": a.tokOut]
            }
        let since = all.filter { $0.value.values.contains { $0.values.contains { $0.cost > 0 } } }.keys.min()
        return [
            "range": range, "unit": unit == .day ? "day" : unit == .month ? "month" : "week",
            "starts": starts.map(Self.key), "totals": totals.map(round), "total": round(total),
            "projects": list, "models": models, "since": orNull(since), "reading": reading,
        ]
    }

    /// The git repo a folder is in, by its `.git`; a worktree's is its main repo's (Claude's own worktrees too), a
    /// submodule is a project of its own. Not the home folder (a dotfiles repo there would swallow every folder), else the
    /// folder itself. No git process: only a few file checks per folder.
    static func repoRoot(of cwd: String) -> String {
        guard cwd.hasPrefix("/") else { return cwd }
        var dir = cwd
        while dir != "/", dir != HOME, !dir.isEmpty {
            let git = (dir as NSString).appendingPathComponent(".git")
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: git, isDirectory: &isDir) {
                if isDir.boolValue { return dir }
                // "gitdir: /path/repo/.git/worktrees/name"
                if let text = try? String(contentsOfFile: git, encoding: .utf8), let r = text.range(of: "gitdir: ") {
                    let gitdir = text[r.upperBound...].trimmingCharacters(in: .whitespacesAndNewlines)
                    if let w = gitdir.range(of: "/.git/worktrees/") { return String(gitdir[..<w.lowerBound]) }
                }
                return dir
            }
            dir = (dir as NSString).deletingLastPathComponent
        }
        return cwd
    }
}
