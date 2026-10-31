import CryptoKit
import Foundation
import IOKit
import Network
import WebKit

/// A published build, as the API offers it.
struct Release: Codable, Equatable {
    let build: Int
    let version: String
    let url: String
    let sha256: String
    let signature: String
    let notes: String
}

/// Which Mac an account belongs to: SHA-256 of its hardware UUID (IOPlatformUUID) with an app-specific salt, so it
/// reveals nothing about the hardware. It signs nobody in (other software can read the UUID); the token does.
enum DeviceID {
    static let hash: String = {
        let service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOPlatformExpertDevice"))
        defer { IOObjectRelease(service) }
        var uuid = IORegistryEntryCreateCFProperty(service, kIOPlatformUUIDKey as CFString, kCFAllocatorDefault, 0)?
            .takeRetainedValue() as? String ?? ""
        if uuid.isEmpty {
            // No hardware UUID (never seen on a real Mac): a random one kept by the app, so Macs never share a hash.
            uuid = UserDefaults.standard.string(forKey: "fallbackDeviceID") ?? UUID().uuidString
            UserDefaults.standard.set(uuid, forKey: "fallbackDeviceID")
        }
        return SHA256.hash(data: Data(("atalay-terminal/device/v1:" + uuid).utf8)).map { String(format: "%02x", $0) }.joined()
    }()
}

/// The app's link to the Atalay's Terminal API: the user's hacker name and tag, how many are online, and newer builds.
/// A heartbeat every minute keeps this Mac online and asks for updates.
@MainActor
final class Cloud {
    static let shared = Cloud()

    /// Your level and active time as the API counts them (api/src/xp.ts); the pages show them as they are.
    struct XP: Codable, Equatable {
        let level: Int
        let rank: String
        /// Total XP, where this level started and where the next one starts (nil at the last level).
        let xp: Int
        let from: Int
        let to: Int?
        /// Active seconds today, and how many more of them count double.
        let today: Int
        let rested: Int
        /// Days this week with 30+ active minutes, the goal, full weeks in a row before this one, the XP bonus (%).
        let week: Int
        let goal: Int
        let streak: Int
        let bonus: Int
        /// Active seconds ever; whether friends see the active time.
        let total: Int
        let show: Bool
        /// Active seconds on each of the last 7 days, today last.
        let days: [Int]?
        /// Listed on the leaderboard.
        let board: Bool?
    }

    struct State: Equatable {
        var reachable = false
        /// Nil until the API answered; false means the user still has to pick a hacker name.
        var registered: Bool?
        var hackerName: String?
        /// Names repeat; name + tag (1–9999, shown as #0427) is unique, like Discord.
        var tag: Int?
        var online = 0
        var update: Release?
        /// Progress while an update installs.
        var updating: String?
        /// Why the last install attempt failed ("not_writable", "failed"), for the page to show once.
        var updateError: String?
        /// Why the API refused a name picked offline ("name_full", …), for the page to show once.
        var nameError: String?
        var xp: XP?
    }

    /// What became of a name the user picked.
    enum Outcome { case done, queued, failed(String) }

    /// Starts with the last known name and tag (or a name picked offline), so an offline launch still shows them.
    private(set) var state: State = {
        var s = State()
        s.hackerName = UserDefaults.standard.string(forKey: "pendingHackerName") ?? UserDefaults.standard.string(forKey: "hackerName")
        s.tag = UserDefaults.standard.object(forKey: "hackerTag") as? Int
        s.xp = UserDefaults.standard.data(forKey: "xp").flatMap { try? JSONDecoder().decode(XP.self, from: $0) }
        return s
    }() {
        didSet {
            guard state != oldValue else { return }
            if state.hackerName != oldValue.hackerName { UserDefaults.standard.set(state.hackerName, forKey: "hackerName") }
            if state.tag != oldValue.tag { UserDefaults.standard.set(state.tag, forKey: "hackerTag") }
            // Your XP: kept for an offline launch, and the notices panel plays the fanfare when the level went up.
            if state.xp != oldValue.xp, let x = state.xp {
                UserDefaults.standard.set(try? JSONEncoder().encode(x), forKey: "xp")
                MessagePanel.notices.xp(x)
            }
            onChange?(state)
            Social.shared.sync(state)
            // A build newer than the one on offer before (or the first one this launch): the "update available" notice.
            if let u = state.update, u.build != oldValue.update?.build { MessagePanel.notices.announce(update: u) }
        }
    }
    var onChange: ((State) -> Void)?
    /// `--update`: install a newer build as soon as one is offered.
    var installUpdatesRightAway = false

    let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "dev"
    /// 0 when run unbundled (swift run), which never asks for updates.
    let build = Int(Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0
    private let base = URL(string: ProcessInfo.processInfo.environment["ATALAY_API_URL"]
        ?? Bundle.main.object(forInfoDictionaryKey: "AtalayAPIURL") as? String ?? "http://127.0.0.1:4800")!
    private var client: [String: Any] {
        ["appVersion": version, "build": build, "osVersion": ProcessInfo.processInfo.operatingSystemVersionString]
    }

    /// The device token, kept next to the app's other files and readable by this user only. One per API (production,
    /// a local one while developing), so the two never sign each other out.
    private lazy var tokenURL = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support"))
        .appendingPathComponent("atalay-terminal/device-token-" + (base.host ?? "api") + (base.port.map { "-\($0)" } ?? ""))
    private var token: String? {
        get { try? String(contentsOf: tokenURL, encoding: .utf8) }
        set {
            guard let newValue else { try? FileManager.default.removeItem(at: tokenURL); return }
            try? FileManager.default.createDirectory(at: tokenURL.deletingLastPathComponent(), withIntermediateDirectories: true)
            FileManager.default.createFile(atPath: tokenURL.path, contents: Data(newValue.utf8), attributes: [.posixPermissions: 0o600])
        }
    }

    /// A name picked while the API was out of reach (first launch or a rename). It shows at once, stays on this Mac
    /// across restarts and goes to the API with the first heartbeat that gets through.
    private var pendingName: String? {
        get { UserDefaults.standard.string(forKey: "pendingHackerName") }
        set { UserDefaults.standard.set(newValue, forKey: "pendingHackerName") }
    }

    private let path = NWPathMonitor()
    private var pathUp: Bool?
    private var beating = false

    /// Nothing here waits on the network: the dashboard and the terminals work offline, the API catches up later.
    func start() {
        Task { await beat() }
        let t = Timer(timeInterval: 60, repeats: true) { _ in Task { @MainActor in await Cloud.shared.beat() } }
        t.tolerance = 10
        RunLoop.main.add(t, forMode: .common)
        // The network coming back syncs at once instead of at the next heartbeat; losing it shows at once.
        path.pathUpdateHandler = { p in
            let up = p.status == .satisfied
            Task { @MainActor in Cloud.shared.pathChanged(up: up) }
        }
        path.start(queue: DispatchQueue(label: "atalay-terminal.network"))
    }

    private func pathChanged(up: Bool) {
        defer { pathUp = up }
        guard let was = pathUp, was != up else { return }
        if up {
            Task { await beat() }
            Social.shared.kick()
        } else {
            state.reachable = false
        }
    }

    /// Every minute, at launch and when the network returns. Signed in: a heartbeat. Without a token (first launch, a
    /// lost token, launched offline): ask the API, which no longer recognises a Mac by its hash, so the user picks a name.
    func beat() async {
        guard !beating else { return }
        beating = true
        defer { beating = false }
        if let token { await heartbeat(token) } else { await identify() }
    }

    /// Keeps this Mac online, says whether its user is working (XP), picks up updates and sends a name picked offline.
    private func heartbeat(_ token: String) async {
        struct Answer: Decodable { let hackerName: String; let tag: Int; let online: Int; let update: Release?; let xp: XP? }
        let work: [String: Any] = ["active": Activity.active, "tz": TimeZone.current.secondsFromGMT() / 60]
        do {
            let a: Answer = try await call("POST", "v1/heartbeat", body: client.merging(work) { $1 }, token: token)
            var name = a.hackerName, tag = a.tag
            if let wanted = pendingName {
                switch await send(name: wanted, token: token) {
                case let .saved(n, t):
                    if pendingName == wanted { pendingName = nil }
                    name = n
                    tag = t
                case let .refused(code):
                    if pendingName == wanted { pendingName = nil }
                    state.nameError = code
                case .later:
                    name = wanted
                    tag = state.tag ?? a.tag
                }
            }
            var s = state
            s.reachable = true
            s.registered = true
            s.hackerName = name
            s.tag = tag
            s.online = a.online
            s.update = build > 0 ? a.update : nil
            s.xp = a.xp ?? s.xp
            state = s
            if installUpdatesRightAway, state.update != nil { installUpdate() }
        } catch Failure.status(401, _) {
            // The token isn't valid anymore: start over.
            self.token = nil
            await identify()
        } catch {
            state.reachable = false
        }
    }

    private func identify() async {
        struct Answer: Decodable { let known: Bool; let hackerName: String?; let tag: Int?; let token: String? }
        do {
            let a: Answer = try await call("POST", "v1/devices/identify", body: client.merging(["deviceHash": DeviceID.hash]) { $1 })
            if a.known, let t = a.token {
                token = t
                await heartbeat(t)
            } else if let name = pendingName {
                // Named offline before this Mac was registered: register with that name now.
                pendingName = nil
                if case let .failed(code) = await register(name) {
                    var s = state
                    s.reachable = true
                    s.registered = false
                    s.hackerName = nil
                    s.tag = nil
                    s.nameError = code
                    state = s
                }
            } else {
                var s = state
                s.reachable = true
                s.registered = false
                s.hackerName = nil
                s.tag = nil
                state = s
            }
        } catch {
            state.reachable = false
        }
    }

    func register(_ name: String) async -> Outcome {
        struct Answer: Decodable { let hackerName: String; let tag: Int; let token: String }
        do {
            let a: Answer = try await call("POST", "v1/devices", body: client.merging(["deviceHash": DeviceID.hash, "hackerName": name]) { $1 })
            token = a.token
            if pendingName == name { pendingName = nil }
            var s = state
            s.reachable = true
            s.registered = true
            s.hackerName = a.hackerName
            s.tag = a.tag
            s.nameError = nil
            state = s
            await heartbeat(a.token)
            return .done
        } catch Failure.status(409, "device_exists") {
            // Registered before (reinstall, erased disk): sign in and keep the name just picked.
            pendingName = name
            await identify()
            return .done
        } catch let Failure.status(_, code) {
            return .failed(code.isEmpty ? "failed" : code)
        } catch {
            state.reachable = false
            return keep(name)
        }
    }

    func rename(_ name: String) async -> Outcome {
        guard let token, state.reachable else { return keep(name) }
        switch await send(name: name, token: token) {
        case let .saved(n, t):
            pendingName = nil
            var s = state
            s.hackerName = n
            s.tag = t
            s.nameError = nil
            state = s
            return .done
        case let .refused(code):
            return .failed(code)
        case .later:
            // Offline or signed out: the next heartbeat sends it (signing in again first).
            return keep(name)
        }
    }

    private enum Sent { case saved(String, Int), refused(String), later }

    private func send(name: String, token: String) async -> Sent {
        struct Answer: Decodable { let hackerName: String; let tag: Int }
        do {
            let a: Answer = try await call("PATCH", "v1/me", body: ["hackerName": name], token: token)
            return .saved(a.hackerName, a.tag)
        } catch let Failure.status(code, error) where code < 500 && code != 401 {
            return .refused(error.isEmpty ? "failed" : error)
        } catch {
            return .later
        }
    }

    /// Keeps a name picked while the API is out of reach: it shows at once and goes out with the next heartbeat.
    private func keep(_ name: String) -> Outcome {
        pendingName = name
        var s = state
        s.hackerName = name
        s.nameError = nil
        state = s
        return .queued
    }

    func installUpdate() {
        guard let update = state.update, state.updating == nil else { return }
        state.updating = "downloading \(update.version)…"
        state.updateError = nil
        Task {
            do {
                try await Updater.install(update) { self.state.updating = $0 }
            } catch Updater.Failure.cancelled {
                state.updating = nil
            } catch {
                NSLog("Atalay's Terminal: update failed: %@", String(describing: error))
                state.updating = nil
                state.updateError = (error as? Updater.Failure)?.code ?? "failed"
            }
        }
    }

    /// A live event with your XP (the daily bonus, a new level): the same state a heartbeat brings, now.
    func apply(xpEvent json: String) {
        struct Event: Decodable { let type: String; let xp: XP? }
        guard let e = try? JSONDecoder().decode(Event.self, from: Data(json.utf8)), e.type == "xp", let x = e.xp else { return }
        state.xp = x
    }

    // MARK: friends and messages

    /// A one-use ticket for the live socket (it can't carry the token in a header from every client).
    func liveTicket() async -> String? {
        guard let token else { return nil }
        struct Answer: Decodable { let ticket: String }
        let a: Answer? = try? await call("POST", "v1/live/ticket", body: [:], token: token)
        return a?.ticket
    }

    func liveURL(ticket: String) -> URL {
        var c = URLComponents(url: base.appendingPathComponent("v1/live"), resolvingAgainstBaseURL: false)!
        c.scheme = base.scheme == "https" ? "wss" : "ws"
        c.queryItems = [URLQueryItem(name: "ticket", value: ticket)]
        return c.url!
    }

    /// The friends and messages endpoints for the pages: JSON in, the API's JSON out, or `{error}` with its code
    /// ("offline" when it can't be reached, "signed_out" before a hacker name is picked).
    func social(_ method: String, _ path: String, body: Any?) async -> Any {
        guard let token else { return ["error": "signed_out"] }
        guard let url = URL(string: path, relativeTo: base) else { return ["error": "bad_path"] }
        var req = URLRequest(url: url, timeoutInterval: 15)
        req.httpMethod = method
        req.setValue("Bearer " + token, forHTTPHeaderField: "authorization")
        if let body, method != "GET", JSONSerialization.isValidJSONObject(body) {
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)
            req.setValue("application/json", forHTTPHeaderField: "content-type")
        }
        ClientKey.sign(&req)
        do {
            let (data, response) = try await URLSession.shared.data(for: req)
            ClientKey.learn(from: response)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let json = (try? JSONSerialization.jsonObject(with: data)) ?? [String: Any]()
            if (200..<300).contains(status) { return json }
            // Signed out (another install of this Mac took the token): the heartbeat signs in again.
            if status == 401 { Task { await self.beat() } }
            return ["error": (json as? [String: Any])?["error"] as? String ?? "http_\(status)"]
        } catch {
            return ["error": "offline"]
        }
    }

    // MARK: HTTP

    private enum Failure: Error { case status(Int, String) }

    private func call<T: Decodable>(_ method: String, _ path: String, body: [String: Any]? = nil, token: String? = nil) async throws -> T {
        var req = URLRequest(url: base.appendingPathComponent(path), timeoutInterval: 15)
        req.httpMethod = method
        if let body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            req.setValue("application/json", forHTTPHeaderField: "content-type")
        }
        if let token { req.setValue("Bearer " + token, forHTTPHeaderField: "authorization") }
        ClientKey.sign(&req)
        let (data, response) = try await URLSession.shared.data(for: req)
        ClientKey.learn(from: response)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            let code = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String ?? ""
            throw Failure.status(status, code)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
}

extension Cloud {
    /// What the dashboard page shows: the hacker name and tag, online count, version and any update.
    var json: [String: Any] {
        let s = state
        return [
            "reachable": s.reachable, "registered": s.registered.map { $0 as Any } ?? NSNull(),
            "hackerName": s.hackerName ?? NSNull(), "tag": s.tag.map { $0 as Any } ?? NSNull(),
            "online": s.online, "version": version, "build": build,
            "update": s.update.map { ["version": $0.version, "build": $0.build, "notes": $0.notes] as [String: Any] } ?? NSNull(),
            "updating": s.updating ?? NSNull(), "updateError": s.updateError ?? NSNull(), "nameError": s.nameError ?? NSNull(),
            "xp": s.xp.flatMap { try? JSONSerialization.jsonObject(with: JSONEncoder().encode($0)) } ?? NSNull(),
        ]
    }
}

/// The dashboard page's hacker name, settings and update screens reach Cloud through this ("cloud" handler, with replies).
@MainActor
final class CloudBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let name = body["name"] as? String ?? ""
        let cloud = Cloud.shared
        Task {
            switch body["type"] as? String {
            case "state":
                replyHandler(cloud.json, nil)
            case "register":
                replyHandler(Self.answer(await cloud.register(name)), nil)
            case "rename":
                replyHandler(Self.answer(await cloud.rename(name)), nil)
            case "update":
                cloud.installUpdate()
                replyHandler(true, nil)
            case "social":
                // Only the friends, messages and feedback endpoints; the page never reaches anything else with the token.
                let path = body["path"] as? String ?? ""
                guard ["v1/me/status", "v1/me/activity", "v1/me/leaderboard", "v1/feedback"].contains(path) || ["v1/social", "v1/friends", "v1/messages", "v1/leaderboard"].contains(where: { path == $0 || path.hasPrefix($0 + "/") || path.hasPrefix($0 + "?") }),
                      !path.contains("..") else {
                    replyHandler(["error": "bad_path"], nil)
                    return
                }
                replyHandler(await cloud.social(body["method"] as? String ?? "GET", path, body: body["body"]), nil)
            case "openChat":
                MessagePanel.openChat(friend: body["id"] as? String ?? "")
                replyHandler(true, nil)
            default:
                replyHandler(nil, "unknown message")
            }
        }
    }

    /// `queued`: kept on this Mac (offline) and sent when the API answers again.
    private static func answer(_ outcome: Cloud.Outcome) -> [String: Any] {
        switch outcome {
        case .done: return ["error": NSNull()]
        case .queued: return ["error": NSNull(), "queued": true]
        case let .failed(code): return ["error": code]
        }
    }
}
