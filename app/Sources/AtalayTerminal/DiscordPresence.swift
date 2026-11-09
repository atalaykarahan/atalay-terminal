import Foundation

/// Discord's Rich Presence: what the app is doing shows on your Discord profile ("Playing Atalay's Terminal"), as games
/// show theirs. On unless Settings · DISCORD turns it off. It says how many sessions run, how many are at work or wait
/// for you and the AI tools at work, never a prompt, code or a file's name. Two more switches add the project's name
/// (the folder of the session at work, "+2" for the other folders at work, all of them under the tool's picture) and
/// today's active time as XP counts it (Cloud's `xp.today`, with the level under the app's picture). The Windows app's
/// discord.js does the same.
///
/// It talks to the Discord app on this Mac over its local socket ($TMPDIR/discord-ipc-0…9) in Discord's IPC frames:
/// an op and a length (UInt32 each, little-endian), then that much JSON. A handshake (op 0) names the application,
/// Discord answers READY, then each SET_ACTIVITY (op 1) replaces what the profile shows. No Discord running, it tries
/// again every 15 s; Discord quitting drops the socket and it tries again the same way. The app quitting closes the
/// socket and Discord clears the presence by itself.
@MainActor
final class DiscordPresence {
    static let shared = DiscordPresence()
    /// The Discord application's id (discord.com/developers/applications → the app → OAuth2 → Client ID). Its name is
    /// what Discord shows after "Playing"; its Rich Presence art assets are the pictures, under the keys `logo`,
    /// `claude`, `codex`, `gemini` and `antigravity` (a missing one shows no picture). Empty: Settings says so and
    /// nothing connects.
    static let clientID = "1569329758775414905"

    /// Called on a change of anything Settings shows.
    var onChange: (() -> Void)?
    /// Settings' "show what I'm doing on Discord".
    private(set) var enabled = UserDefaults.standard.object(forKey: "discordPresence") as? Bool ?? true
    /// Settings' "show the project's name".
    private(set) var showProject = UserDefaults.standard.bool(forKey: "discordPresenceProject")
    /// Settings' "show my active time".
    private(set) var showActive = UserDefaults.standard.object(forKey: "discordPresenceActive") as? Bool ?? true
    /// Discord answered the handshake: what's sent shows.
    private(set) var connected = false

    private var fd: Int32 = -1
    private var reader: FileHandle?
    private var inbox = Data()
    /// Writes go out in order, off the main thread.
    private let io = DispatchQueue(label: "discord-ipc")
    private var retry: Timer?
    private var throttle: Timer?
    private var lastSent = Date.distantPast
    /// The sessions last seen, to build the presence again when a switch changes.
    private var briefs: [SessionBrief] = []
    /// What Discord shows now ("" after a (re)connect: the next one goes out).
    private var sentActivity = ""
    private var sentPage = ""
    /// The elapsed time on the profile counts from the app's start.
    private let started = Int(Date().timeIntervalSince1970)

    private init() {}

    func start() {
        connect()
        changed()
    }

    func setEnabled(_ value: Bool) {
        enabled = value
        UserDefaults.standard.set(value, forKey: "discordPresence")
        if value { connect() } else { drop(again: false) }
        changed()
    }

    func setShowProject(_ value: Bool) {
        showProject = value
        UserDefaults.standard.set(value, forKey: "discordPresenceProject")
        send()
        changed()
    }

    func setShowActive(_ value: Bool) {
        showActive = value
        UserDefaults.standard.set(value, forKey: "discordPresenceActive")
        send()
        changed()
    }

    /// The engine's sessions changed.
    func update(_ list: [SessionBrief]) {
        briefs = list
        send()
    }

    /// Cloud's state changed: today's active time and the level may have.
    func refresh() { send() }

    // MARK: what shows

    /// The AI tool a session belongs to: Claude's sessions are Claude Code, the others ("ai:…") carry their tool's name.
    private static func tool(_ b: SessionBrief) -> String { b.id.hasPrefix("ai:") ? b.name : "Claude Code" }

    /// The art asset of a tool's picture, as the Discord application has them.
    private static func asset(_ tool: String) -> String? {
        switch tool.lowercased() {
        case "claude code", "claude": return "claude"
        case "codex": return "codex"
        case "gemini": return "gemini"
        case "antigravity": return "antigravity"
        default: return nil
        }
    }

    private func activity() -> [String: Any] {
        let live = briefs.filter(\.live)
        let busy = live.filter { $0.status == "busy" }
        let waiting = live.filter { $0.status == "waiting" }.count
        var tools: [String] = []
        for b in busy where !tools.contains(Self.tool(b)) { tools.append(Self.tool(b)) }
        tools.sort()

        let details = tools.isEmpty ? (live.isEmpty ? "Idle" : "Between turns") : "Working with " + tools.joined(separator: ", ")
        var parts = [live.isEmpty ? "no sessions" : live.count == 1 ? "1 session" : "\(live.count) sessions"]
        if !busy.isEmpty, live.count > 1 { parts.append("\(busy.count) at work") }
        if waiting > 0 { parts.append("\(waiting) waiting") }

        // The sessions at work (else all of them), the latest first: the first one's project and tool's picture lead.
        let pool = (busy.isEmpty ? live : busy).sorted { $0.statusSince > $1.statusSince }
        var projects: [String] = []
        for b in pool { if let name = Self.project(b.cwd), !projects.contains(name) { projects.append(name) } }
        if showProject, let first = projects.first { parts.insert(projects.count > 1 ? "\(first) +\(projects.count - 1)" : first, at: 0) }

        let xp = Cloud.shared.state.xp
        if showActive, let today = xp?.today, today >= 60 { parts.append("\(Self.duration(today)) today") }

        var assets: [String: Any] = ["large_image": "logo",
                                     "large_text": xp.map { "Level \($0.level) · \($0.rank)" } ?? "Atalay's Terminal"]
        if let lead = pool.first, let key = Self.asset(Self.tool(lead)) {
            assets["small_image"] = key
            let all = showProject && projects.count > 1 ? " · " + projects.joined(separator: ", ") : ""
            assets["small_text"] = Self.fit(Self.tool(lead) + all)
        }
        return ["details": Self.fit(details), "state": Self.fit(parts.joined(separator: " · ")),
                "timestamps": ["start": started], "assets": assets, "instance": false]
    }

    /// 4h 12m, 35m.
    private static func duration(_ seconds: Int) -> String {
        let h = seconds / 3600, m = seconds % 3600 / 60
        return h > 0 ? "\(h)h \(m)m" : "\(m)m"
    }

    /// A folder's name, not the home folder or the disk's root.
    private static func project(_ cwd: String) -> String? {
        guard !cwd.isEmpty, cwd != "/", cwd != NSHomeDirectory() else { return nil }
        let name = (cwd as NSString).lastPathComponent
        return name.isEmpty ? nil : name
    }

    /// Discord takes 2–128 characters a line.
    private static func fit(_ s: String) -> String {
        let t = s.count > 128 ? String(s.prefix(127)) + "…" : s
        return t.count < 2 ? t + " " : t
    }

    /// Sends what should show, when it changed; Discord takes 5 updates in 20 s, so at most one each 4 s.
    private func send() {
        guard enabled, connected, throttle == nil else { return }
        let a = activity()
        guard let data = try? JSONSerialization.data(withJSONObject: a, options: [.sortedKeys]) else { return }
        let json = String(decoding: data, as: UTF8.self)
        guard json != sentActivity else { return }
        let wait = 4 - Date().timeIntervalSince(lastSent)
        if wait > 0 {
            throttle = Timer.scheduledTimer(withTimeInterval: wait, repeats: false) { [weak self] _ in
                MainActor.assumeIsolated {
                    self?.throttle = nil
                    self?.send()
                }
            }
            return
        }
        sentActivity = json
        lastSent = Date()
        write(op: 1, ["cmd": "SET_ACTIVITY", "nonce": UUID().uuidString,
                      "args": ["pid": Int(ProcessInfo.processInfo.processIdentifier), "activity": a]])
    }

    // MARK: the socket

    private func connect() {
        guard enabled, fd < 0, !Self.clientID.isEmpty else { return }
        retry?.invalidate()
        retry = nil
        guard let s = Self.open() else { return later() }
        fd = s
        let h = FileHandle(fileDescriptor: s, closeOnDealloc: false)
        reader = h
        h.readabilityHandler = { [weak self] h in
            let data = h.availableData
            DispatchQueue.main.async { MainActor.assumeIsolated { self?.received(data, on: s) } }
        }
        write(op: 0, ["v": 1, "client_id": Self.clientID])
    }

    /// Discord's socket on this Mac: the first of discord-ipc-0…9 that answers.
    private static func open() -> Int32? {
        var dirs: [String] = []
        for d in [ProcessInfo.processInfo.environment["TMPDIR"], NSTemporaryDirectory(), "/tmp"].compactMap({ $0 })
        where !dirs.contains(d) { dirs.append(d) }
        for dir in dirs {
            for i in 0..<10 {
                let path = (dir as NSString).appendingPathComponent("discord-ipc-\(i)")
                guard FileManager.default.fileExists(atPath: path) else { continue }
                var addr = sockaddr_un()
                let bytes = Array(path.utf8)
                guard bytes.count < MemoryLayout.size(ofValue: addr.sun_path) else { continue }
                addr.sun_family = sa_family_t(AF_UNIX)
                addr.sun_len = UInt8(MemoryLayout<sockaddr_un>.size)
                withUnsafeMutableBytes(of: &addr.sun_path) { buf in
                    buf.copyBytes(from: bytes)
                    buf[bytes.count] = 0
                }
                let s = socket(AF_UNIX, SOCK_STREAM, 0)
                guard s >= 0 else { continue }
                // Discord gone mid-write is an error to handle, not a SIGPIPE that ends the app.
                var on: Int32 = 1
                setsockopt(s, SOL_SOCKET, SO_NOSIGPIPE, &on, socklen_t(MemoryLayout<Int32>.size))
                let ok = withUnsafePointer(to: &addr) {
                    $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { Darwin.connect(s, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
                }
                if ok == 0 { return s }
                Darwin.close(s)
            }
        }
        return nil
    }

    private func write(op: UInt32, _ payload: [String: Any]) {
        guard fd >= 0, let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var frame = Data(capacity: 8 + body.count)
        withUnsafeBytes(of: op.littleEndian) { frame.append(contentsOf: $0) }
        withUnsafeBytes(of: UInt32(body.count).littleEndian) { frame.append(contentsOf: $0) }
        frame.append(body)
        let s = fd
        io.async {
            let ok = frame.withUnsafeBytes { buf -> Bool in
                var off = 0
                while off < buf.count {
                    let n = Darwin.write(s, buf.baseAddress! + off, buf.count - off)
                    if n < 0, errno == EINTR { continue }
                    if n <= 0 { return false }
                    off += n
                }
                return true
            }
            if !ok { DispatchQueue.main.async { MainActor.assumeIsolated { DiscordPresence.shared.lost(s) } } }
        }
    }

    private func received(_ data: Data, on s: Int32) {
        guard s == fd else { return }
        if data.isEmpty { return lost(s) }
        inbox.append(data)
        while inbox.count >= 8 {
            let base = inbox.startIndex
            let word = { (at: Int) in (0..<4).reduce(UInt32(0)) { $0 | UInt32(self.inbox[base + at + $1]) << (8 * $1) } }
            let op = word(0), len = Int(word(4))
            guard len < 1 << 20 else { return lost(s) }
            guard inbox.count >= 8 + len else { break }
            let body = inbox.subdata(in: base + 8 ..< base + 8 + len)
            inbox = Data(inbox[(base + 8 + len)...])
            frame(op, body)
            guard s == fd else { return }
        }
    }

    private func frame(_ op: UInt32, _ body: Data) {
        let msg = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] ?? [:]
        switch op {
        case 1:
            switch msg["evt"] as? String {
            case "READY":
                connected = true
                sentActivity = ""
                changed()
                send()
            case "ERROR":
                NSLog("discord: %@", String(describing: msg["data"] ?? ""))
            default: break
            }
        case 2:
            // Discord closed it: a wrong client id, or Discord quitting.
            NSLog("discord: closed · %@", String(describing: msg["message"] ?? ""))
            lost(fd)
        case 3:
            write(op: 4, msg)
        default: break
        }
    }

    /// The socket `s` broke or closed: try again later, while on.
    private func lost(_ s: Int32) {
        guard s == fd, s >= 0 else { return }
        drop(again: true)
    }

    private func drop(again: Bool) {
        retry?.invalidate()
        retry = nil
        throttle?.invalidate()
        throttle = nil
        if fd >= 0 {
            reader?.readabilityHandler = nil
            reader = nil
            let s = fd
            // After the writes still queued.
            io.async { Darwin.close(s) }
            fd = -1
        }
        inbox.removeAll()
        sentActivity = ""
        if connected {
            connected = false
            changed()
        }
        if again { later() }
    }

    private func later() {
        guard enabled, retry == nil else { return }
        retry = Timer.scheduledTimer(withTimeInterval: 15, repeats: false) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.retry = nil
                self?.connect()
            }
        }
    }

    // MARK: Settings

    private func changed() {
        let now = json
        guard now != sentPage else { return }
        sentPage = now
        onChange?()
    }

    /// For the page: Settings · DISCORD's switches and what they're doing.
    var json: String {
        let state: [String: Any] = ["available": !Self.clientID.isEmpty, "on": enabled, "project": showProject, "active": showActive,
                                    "connected": connected]
        guard let data = try? JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]) else { return "null" }
        return String(decoding: data, as: UTF8.self)
    }
}
