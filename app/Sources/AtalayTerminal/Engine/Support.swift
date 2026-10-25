import Foundation

// MARK: - pricing (list price, $ per million tokens)
// Cache writes bill 1.25x input (5m TTL) or 2x input (1h TTL); cache reads bill `cr`.

struct Price {
    let input: Double, output: Double, cr: Double, ctx: Double
    var longAt: Int? = nil
    var longIn = 0.0, longOut = 0.0, longCr = 0.0
}

let PRICES: [(String, Price)] = [
    ("claude-fable-5-1", Price(input: 10, output: 50, cr: 0.25, ctx: 1e6)),
    ("claude-mythos-5-1", Price(input: 10, output: 50, cr: 0.25, ctx: 1e6)),
    ("claude-fable-5", Price(input: 10, output: 50, cr: 1, ctx: 1e6)),
    ("claude-mythos-5", Price(input: 10, output: 50, cr: 1, ctx: 1e6)),
    ("claude-opus-5-5", Price(input: 4, output: 20, cr: 0.2, ctx: 1e6)),
    ("claude-opus-5", Price(input: 5, output: 25, cr: 0.5, ctx: 1e6)),
    ("claude-opus-4", Price(input: 5, output: 25, cr: 0.5, ctx: 1e6)),
    ("claude-sonnet-5", Price(input: 2, output: 10, cr: 0.2, ctx: 1e6)),
    ("claude-sonnet-4", Price(input: 3, output: 15, cr: 0.3, ctx: 1e6)),
    ("claude-haiku-5-5", Price(input: 0.1, output: 0.5, cr: 0.01, ctx: 0, longAt: 100_000, longIn: 0.5, longOut: 2.5, longCr: 0.05)),
    ("claude-haiku-4-5", Price(input: 1, output: 5, cr: 0.1, ctx: 2e5)),
]

func priceFor(_ model: String?) -> Price? {
    guard let model, !model.isEmpty else { return nil }
    return PRICES.first(where: { model.hasPrefix($0.0) })?.1
}

func costOf(_ model: String?, _ u: [String: Any]) -> Double {
    guard let p = priceFor(model) else { return 0 }
    let inp = Double(int(u["input_tokens"])), out = Double(int(u["output_tokens"]))
    let cr = Double(int(u["cache_read_input_tokens"])), cw = Double(int(u["cache_creation_input_tokens"]))
    let w1h = Double(int((u["cache_creation"] as? [String: Any])?["ephemeral_1h_input_tokens"]))
    let w5m = max(0, cw - w1h)
    var pin = p.input, pout = p.output, pcr = p.cr
    if let at = p.longAt, inp + cr + cw > Double(at) { pin = p.longIn; pout = p.longOut; pcr = p.longCr }
    let speed = (u["speed"] as? String) == "fast" ? 2.0 : 1.0
    return speed * (inp * pin + out * pout + cr * pcr + w5m * pin * 1.25 + w1h * pin * 2) / 1e6
}

func savedOf(_ model: String?, _ u: [String: Any]) -> Double {
    guard let p = priceFor(model) else { return 0 }
    return Double(int(u["cache_read_input_tokens"])) * (p.input - p.cr) / 1e6
}

func shortModel(_ m: String?) -> String {
    guard var s = m, !s.isEmpty else { return "" }
    if s.hasPrefix("claude-") { s.removeFirst(7) }
    s = s.replacingOccurrences(of: #"-\d{8}$"#, with: "", options: .regularExpression)
    s = s.replacingOccurrences(of: #"^([a-z]+)-(\d+)-(\d+)$"#, with: "$1 $2.$3", options: .regularExpression)
    s = s.replacingOccurrences(of: #"^([a-z]+)-(\d+)$"#, with: "$1 $2", options: .regularExpression)
    return s
}

// MARK: - tool categories

let CATS = ["web", "browser", "read", "search", "edit", "bash", "agent", "mcp", "plan"]
private let CAT_OF: [String: String] = [
    "WebSearch": "web", "WebFetch": "web",
    "Read": "read", "NotebookRead": "read",
    "Grep": "search", "Glob": "search", "ToolSearch": "search", "LSP": "search",
    "ListMcpResourcesTool": "search", "ReadMcpResourceTool": "search", "ReadMcpResourceDirTool": "search",
    "Edit": "edit", "Write": "edit", "MultiEdit": "edit", "NotebookEdit": "edit",
    "Bash": "bash", "BashOutput": "bash", "KillShell": "bash", "KillBash": "bash", "Monitor": "bash", "PowerShell": "bash",
    "Agent": "agent", "Task": "agent", "Workflow": "agent", "SendMessage": "agent", "TaskStop": "agent",
    "TaskOutput": "agent", "ListAgents": "agent",
]

func catOf(_ name: String) -> String {
    if let c = CAT_OF[name] { return c }
    if name.hasPrefix("mcp__claude-in-chrome__") || name.hasPrefix("mcp__computer") || name == "computer" { return "browser" }
    if name.hasPrefix("mcp__") { return "mcp" }
    return "plan"
}

// MARK: - value helpers

func int(_ v: Any?) -> Int {
    if let n = v as? NSNumber { return n.intValue }
    if let i = v as? Int { return i }
    return 0
}

func str(_ v: Any?) -> String? { v as? String }

func clip(_ s: String?, _ n: Int) -> String {
    guard let s, !s.isEmpty else { return "" }
    let t = s.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).joined(separator: " ")
    return t.count > n ? String(t.prefix(n - 1)) + "…" : t
}

// The radar may end up in a screen recording, so obvious credentials never reach the page.
private let secretPatterns: [NSRegularExpression] = [
    #"sk-ant-[A-Za-z0-9_-]{10,}"#,
    #"\bsk-[A-Za-z0-9_-]{20,}"#,
    #"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}"#,
    #"\bgithub_pat_[A-Za-z0-9_]{20,}"#,
    #"\blin_(?:api|oauth)_[A-Za-z0-9]{20,}"#,
    #"\bxox[abprs]-[A-Za-z0-9-]{10,}"#,
    #"\bAKIA[0-9A-Z]{16}\b"#,
    #"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}"#,
    #"\b[A-Fa-f0-9]{32,}\b"#,
].map { try! NSRegularExpression(pattern: $0) }
private let keyValueSecret = try! NSRegularExpression(
    pattern: #"\b(pass(?:word|wd)?|secret|token|api[_-]?key|apikey|authorization|bearer)(["']?\s*[:=]\s*["']?|\s+)([^\s"'&;]{6,})"#,
    options: [.caseInsensitive])
private let longToken = try! NSRegularExpression(pattern: #"[A-Za-z0-9+=]{32,}"#)

func redact(_ s: String?) -> String {
    guard let s, !s.isEmpty else { return "" }
    var t = s
    for rx in secretPatterns {
        t = rx.stringByReplacingMatches(in: t, range: NSRange(t.startIndex..., in: t), withTemplate: "‹•••›")
    }
    var out = ""
    var last = t.startIndex
    for m in keyValueSecret.matches(in: t, range: NSRange(t.startIndex..., in: t)) {
        guard let whole = Range(m.range, in: t), let k = Range(m.range(at: 1), in: t),
              let sep = Range(m.range(at: 2), in: t), let v = Range(m.range(at: 3), in: t) else { continue }
        out += t[last..<whole.lowerBound]
        out += t[v].hasPrefix("$") ? String(t[whole]) : "\(t[k])\(t[sep])‹•••›"
        last = whole.upperBound
    }
    out += t[last...]
    t = out
    out = ""
    last = t.startIndex
    for m in longToken.matches(in: t, range: NSRange(t.startIndex..., in: t)) {
        guard let r = Range(m.range, in: t) else { continue }
        let w = t[r]
        let digits = w.filter(\.isNumber).count, upper = w.filter(\.isUppercase).count, lower = w.filter(\.isLowercase).count
        out += t[last..<r.lowerBound]
        out += digits >= 2 && upper >= 2 && lower >= 2 ? "‹•••›" : String(w)
        last = r.upperBound
    }
    out += t[last...]
    return out
}

let HOME = NSHomeDirectory()

func hostPath(_ u: String?) -> String {
    guard let u, let url = URL(string: u), let host = url.host else { return clip(redact(u), 70) }
    let h = host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
    let p = url.path
    return clip(h + (p == "/" || p.isEmpty ? "" : p), 70)
}

func hostOf(_ u: String?) -> String {
    guard let u, let host = URL(string: u)?.host else { return "" }
    return host.hasPrefix("www.") ? String(host.dropFirst(4)) : host
}

func shortPath(_ p: String?) -> String {
    guard let p, !p.isEmpty else { return "" }
    return p.split(separator: "/").suffix(2).joined(separator: "/")
}

func tildify(_ p: String?) -> String {
    guard let p, !p.isEmpty else { return "" }
    return p.hasPrefix(HOME) ? "~" + p.dropFirst(HOME.count) : p
}

func cwdLabel(_ cwd: String?) -> String {
    let parts = tildify(cwd).split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    if parts.count <= 4 { return parts.joined(separator: "/") }
    return parts.prefix(2).joined(separator: "/") + "/…/" + parts.suffix(2).joined(separator: "/")
}

func projectLabel(_ cwd: String?) -> String {
    let parts = tildify(cwd).split(separator: "/").map(String.init)
    return parts.suffix(2).joined(separator: "/")
}

func fmtBytes(_ n: Int) -> String {
    if n >= 1 << 20 { return String(format: "%.1fMB", Double(n) / Double(1 << 20)) }
    if n >= 1024 { return "\(n / 1024)KB" }
    return "\(n)B"
}

func summarize(_ name: String, _ input: Any?) -> (label: String, file: String?, cmd: String?) {
    let i = input as? [String: Any] ?? [:]
    switch name {
    case "WebSearch": return (clip(redact(str(i["query"])), 90), nil, nil)
    case "WebFetch": return (hostPath(str(i["url"])), nil, nil)
    case "Read", "NotebookRead", "Edit", "MultiEdit", "Write":
        let f = str(i["file_path"])
        return (shortPath(f), f, nil)
    case "NotebookEdit":
        let f = str(i["notebook_path"])
        return (shortPath(f), f, nil)
    case "Grep": return (clip("/\(str(i["pattern"]) ?? "")/ \(shortPath(str(i["path"]) ?? str(i["glob"])))", 70), nil, nil)
    case "Glob": return (clip(str(i["pattern"]), 70), nil, nil)
    case "Bash": return (clip(redact(str(i["description"]) ?? str(i["command"])), 90), nil, clip(redact(str(i["command"])), 180))
    case "Agent", "Task": return (clip(str(i["description"]) ?? str(i["subagent_type"]) ?? "agent", 70), nil, nil)
    case "Skill": return (clip(str(i["skill"]), 50), nil, nil)
    case "ToolSearch": return (clip(str(i["query"]), 60), nil, nil)
    case "TodoWrite": return ("\((i["todos"] as? [Any])?.count ?? 0) todos", nil, nil)
    case "Workflow":
        let n = str(i["name"]) ?? str(i["scriptPath"]).map { ($0 as NSString).lastPathComponent } ?? "workflow"
        return (clip(n, 60), nil, nil)
    case "SendMessage": return (clip("→ \(str(i["to"]) ?? "")", 50), nil, nil)
    case "AskUserQuestion":
        let q = ((i["questions"] as? [[String: Any]])?.first)?["question"] as? String
        return (clip(q, 70), nil, nil)
    default: break
    }
    if name.hasPrefix("mcp__") {
        let parts = name.components(separatedBy: "__")
        var server = parts.count > 1 ? parts[1] : ""
        if server.hasPrefix("claude_ai_") { server.removeFirst(10) }
        let tool = parts.count > 2 ? parts[2...].joined(separator: "__") : ""
        var extra = ""
        if let u = str(i["url"]) { extra = hostPath(u) }
        else if let a = i["actions"] as? [Any] { extra = "×\(a.count)" }
        else if let a = str(i["action"]) { extra = a }
        else if let q = str(i["query"]) { extra = clip(redact(q), 40) }
        return (clip("\(server).\(tool)\(extra.isEmpty ? "" : " " + extra)", 80), nil, nil)
    }
    return ("", nil, nil)
}

// MARK: - time

/// Parses "2026-10-24T19:41:07.123Z" into epoch milliseconds without a DateFormatter.
func parseISO(_ s: String?) -> Double {
    guard let s else { return 0 }
    let u = Array(s.utf8)
    guard u.count >= 20 else { return 0 }
    func num(_ a: Int, _ b: Int) -> Int32 {
        var v: Int32 = 0
        for k in a..<b { v = v * 10 + Int32(u[k] &- 48) }
        return v
    }
    var t = tm()
    t.tm_year = num(0, 4) - 1900
    t.tm_mon = num(5, 7) - 1
    t.tm_mday = num(8, 10)
    t.tm_hour = num(11, 13)
    t.tm_min = num(14, 16)
    t.tm_sec = num(17, 19)
    var ms = 0.0
    if u.count > 20, u[19] == UInt8(ascii: ".") {
        var k = 20, frac = 0.0, scale = 100.0
        while k < u.count, u[k] >= 48, u[k] <= 57 {
            frac += Double(u[k] - 48) * scale
            scale /= 10
            k += 1
        }
        ms = frac
    }
    return Double(timegm(&t)) * 1000 + ms
}

func nowMs() -> Double { Date().timeIntervalSince1970 * 1000 }

func dayStart() -> Double {
    Calendar.current.startOfDay(for: Date()).timeIntervalSince1970 * 1000
}

/// JSONSerialization cannot take Optional values; nil becomes JSON null.
func orNull(_ v: Any?) -> Any { v ?? NSNull() }
