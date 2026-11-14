import CryptoKit
import Foundation
import Security

/// End-to-end encrypted messages. A message to a friend who has a key is sealed here before it leaves the Mac and
/// opened here when it comes in; the server (api/src/e2ee.ts) only ever has sealed bytes, and the pages only ever get
/// messages already open (they go through `social`), so no key is ever in a page.
///
/// The keys:
/// - this computer's own (X25519), in a file of the app's own (KeyFile): the account key's secret reaches it sealed to it;
/// - the account's: a 32-byte secret on every computer of the account the user approved, from which an X25519 key
///   (sealing), an Ed25519 key (signing) and a key for the older generations are made. A computer leaving the account
///   brings a new generation, signed by the one before, the one before sealed in it, so old messages still open;
/// - a conversation's, from the two accounts' keys, the same on both sides; each message has a key of its own from it.
/// A computer new to the account is approved from another one of it (both show a code, the user compares them), or
/// opens the copy sealed to the recovery key. Friends' keys are pinned the first time they're seen: a change that their
/// old key didn't sign shows as a changed security code.
enum E2EECrypto {
    enum Failure: Error { case bad }

    static func random(_ count: Int) -> Data {
        var data = Data(count: count)
        let status = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, count, $0.baseAddress!) }
        precondition(status == errSecSuccess, "no random bytes")
        return data
    }

    static func bytes(_ key: SymmetricKey) -> Data { key.withUnsafeBytes { Data($0) } }

    static func hkdf(_ ikm: Data, salt: Data = Data(), info: String, count: Int = 32) -> SymmetricKey {
        HKDF<SHA256>.deriveKey(inputKeyMaterial: SymmetricKey(data: ikm), salt: salt, info: Data(info.utf8), outputByteCount: count)
    }

    static func hex<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 { bytes.map { String(format: "%02x", $0) }.joined() }

    /// A key's id: SHA-256 over its two public keys, the first 16 bytes in hex (the API checks it the same way).
    static func kid(x: Data, ed: Data) -> String { hex(SHA256.hash(data: x + ed).prefix(16)) }

    /// What a key's signatures cover (the API's `statement`).
    static func statement(account: String, gen: Int, x: Data, ed: Data) -> Data {
        Data("orbiterm e2ee key v1\n\(account)\n\(gen)\n\(x.base64EncodedString())\n\(ed.base64EncodedString())".utf8)
    }

    /// Sealed to an X25519 public key: a one-time key's public half (32 bytes), then AES-GCM (nonce, ciphertext, tag)
    /// under a key both sides make from the two. `context` says what it is for; it must be the same to open it.
    static func seal(_ plain: Data, to pub: Data, context: String) throws -> Data {
        let them = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: pub)
        let once = Curve25519.KeyAgreement.PrivateKey()
        let opub = once.publicKey.rawRepresentation
        let shared = try once.sharedSecretFromKeyAgreement(with: them)
        let key = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: opub + pub, sharedInfo: Data("orbiterm e2ee seal\n\(context)".utf8), outputByteCount: 32)
        guard let box = try AES.GCM.seal(plain, using: key, authenticating: Data(context.utf8)).combined else { throw Failure.bad }
        return opub + box
    }

    static func open(_ sealed: Data, with priv: Curve25519.KeyAgreement.PrivateKey, context: String) throws -> Data {
        let s = Data(sealed)
        guard s.count > 32 + 12 + 16 else { throw Failure.bad }
        let opub = Data(s.prefix(32))
        let shared = try priv.sharedSecretFromKeyAgreement(with: Curve25519.KeyAgreement.PublicKey(rawRepresentation: opub))
        let key = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: opub + priv.publicKey.rawRepresentation,
                                                 sharedInfo: Data("orbiterm e2ee seal\n\(context)".utf8), outputByteCount: 32)
        return try AES.GCM.open(AES.GCM.SealedBox(combined: Data(s.dropFirst(32))), using: key, authenticating: Data(context.utf8))
    }

    /// AES-GCM under a key both sides already have (an older generation sealed in the next one's chain).
    static func lock(_ plain: Data, with key: SymmetricKey, context: String) throws -> Data {
        guard let box = try AES.GCM.seal(plain, using: key, authenticating: Data(context.utf8)).combined else { throw Failure.bad }
        return box
    }

    static func unlock(_ box: Data, with key: SymmetricKey, context: String) throws -> Data {
        try AES.GCM.open(AES.GCM.SealedBox(combined: box), using: key, authenticating: Data(context.utf8))
    }

    /// The key of a conversation: X25519 of the two accounts' keys, the same whichever side makes it.
    static func conversation(_ mine: E2EEAccountKey, theirX: Data) throws -> SymmetricKey {
        let shared = try mine.x.sharedSecretFromKeyAgreement(with: Curve25519.KeyAgreement.PublicKey(rawRepresentation: theirX))
        return shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(), sharedInfo: Data("orbiterm e2ee dm".utf8), outputByteCount: 32)
    }

    /// What a message's seal is bound to: its id and which keys sealed it (sender's, receiver's). The server can't
    /// move a message into another conversation or make it look as if the other side sent it.
    static func messageContext(uuid: String, sk: String, rk: String) -> Data { Data("orbiterm e2ee msg v1\n\(uuid)\n\(sk)\n\(rk)".utf8) }

    /// A message: 16 random bytes (its own key is made from them and the conversation's), then AES-GCM.
    static func sealMessage(_ plain: Data, conversation: SymmetricKey, uuid: String, sk: String, rk: String) throws -> String {
        let salt = random(16)
        let key = HKDF<SHA256>.deriveKey(inputKeyMaterial: conversation, salt: salt, info: Data("orbiterm e2ee msg".utf8), outputByteCount: 32)
        guard let box = try AES.GCM.seal(plain, using: key, authenticating: messageContext(uuid: uuid, sk: sk, rk: rk)).combined else { throw Failure.bad }
        return (salt + box).base64EncodedString()
    }

    static func openMessage(_ ct: String, conversation: SymmetricKey, uuid: String, sk: String, rk: String) throws -> Data {
        guard let d = Data(base64Encoded: ct), d.count > 16 + 12 + 16 else { throw Failure.bad }
        let key = HKDF<SHA256>.deriveKey(inputKeyMaterial: conversation, salt: Data(d.prefix(16)), info: Data("orbiterm e2ee msg".utf8), outputByteCount: 32)
        return try AES.GCM.open(AES.GCM.SealedBox(combined: Data(d.dropFirst(16))), using: key, authenticating: messageContext(uuid: uuid, sk: sk, rk: rk))
    }

    // MARK: recovery key

    /// 32 letters and digits without the ones easy to mix up (no 0/O, 1/I).
    private static let letters = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    /// 20 random bytes as ORBI- and eight groups of four.
    static func recoveryText(_ bytes: Data) -> String {
        var bits = 0, value = 0, out = ""
        for b in bytes {
            value = (value << 8) | Int(b)
            bits += 8
            while bits >= 5 {
                out.append(letters[(value >> (bits - 5)) & 31])
                bits -= 5
            }
            value &= (1 << bits) - 1
        }
        let groups = stride(from: 0, to: out.count, by: 4).map { String(Array(out)[$0 ..< min($0 + 4, out.count)]) }
        return "ORBI-" + groups.joined(separator: "-")
    }

    /// The 20 bytes back from what the user typed or pasted: any case, any dashes or spaces.
    static func recoveryBytes(_ text: String) -> Data? {
        var s = text.uppercased().filter { $0.isLetter || $0.isNumber }
        if s.hasPrefix("ORBI") { s.removeFirst(4) }
        guard s.count == 32 else { return nil }
        var bits = 0, value = 0
        var out = Data()
        for c in s {
            guard let i = letters.firstIndex(of: c) else { return nil }
            value = (value << 5) | i
            bits += 5
            if bits >= 8 {
                out.append(UInt8((value >> (bits - 8)) & 255))
                bits -= 8
                value &= (1 << bits) - 1
            }
        }
        return out.count == 20 ? out : nil
    }

    static func recoveryKey(_ bytes: Data) throws -> Curve25519.KeyAgreement.PrivateKey {
        try .init(rawRepresentation: E2EECrypto.bytes(hkdf(bytes, info: "orbiterm e2ee recovery")))
    }

    // MARK: comparing codes

    /// The short code two computers of an account compare (three groups of four digits), and the key that signs what
    /// the approving one sends after the user said they match.
    static func compareCode(_ shared: SharedSecret, info: String) -> (code: String, mac: SymmetricKey) {
        let b = bytes(shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(), sharedInfo: Data("orbiterm e2ee sas\n\(info)".utf8), outputByteCount: 6))
        let code = (0 ..< 3).map { String(format: "%04d", ((Int(b[$0 * 2]) << 8) | Int(b[$0 * 2 + 1])) % 10000) }.joined(separator: " ")
        let mac = shared.hkdfDerivedSymmetricKey(using: SHA256.self, salt: Data(), sharedInfo: Data("orbiterm e2ee sas mac\n\(info)".utf8), outputByteCount: 32)
        return (code, mac)
    }

    /// A friend's security code: 60 digits from both accounts' first keys (the start of their signed chains), the same
    /// on both sides. It changes only when one of them started over (or someone came in between).
    static func securityCode(_ a: (account: String, x: Data, ed: Data), _ b: (account: String, x: Data, ed: Data)) -> String {
        func half(_ account: String, _ x: Data, _ ed: Data) -> String {
            var h = Data("orbiterm e2ee security code v1\n\(account)".utf8) + x + ed
            for _ in 0 ..< 1024 { h = Data(SHA512.hash(data: h + x + ed)) }
            return (0 ..< 6).map { i -> String in
                let n = h[i * 5 ..< i * 5 + 5].reduce(UInt64(0)) { ($0 << 8) | UInt64($1) }
                return String(format: "%05llu", n % 100_000)
            }.joined()
        }
        return [half(a.account, a.x, a.ed), half(b.account, b.x, b.ed)].sorted().joined()
    }
}

/// An account key, from its 32-byte secret.
struct E2EEAccountKey {
    let seed: Data
    let x: Curve25519.KeyAgreement.PrivateKey
    let ed: Curve25519.Signing.PrivateKey
    /// Seals the generation before this one.
    let chain: SymmetricKey

    init(seed: Data) throws {
        guard seed.count == 32 else { throw E2EECrypto.Failure.bad }
        self.seed = seed
        x = try .init(rawRepresentation: E2EECrypto.bytes(E2EECrypto.hkdf(seed, info: "orbiterm e2ee account x25519")))
        ed = try .init(rawRepresentation: E2EECrypto.bytes(E2EECrypto.hkdf(seed, info: "orbiterm e2ee account ed25519")))
        chain = E2EECrypto.hkdf(seed, info: "orbiterm e2ee account chain")
    }

    var xPub: Data { x.publicKey.rawRepresentation }
    var edPub: Data { ed.publicKey.rawRepresentation }
    var kid: String { E2EECrypto.kid(x: xPub, ed: edPub) }
}

/// A key as the API lists it, kept only when its id and its own signature check out.
struct E2EEKey {
    let kid: String
    /// The account it was made for (its signature names it); not the account it's on now after a merge.
    let account: String
    let gen: Int
    let x: Data
    let ed: Data
    let prev: Data?
    let chain: Data?
    let merged: Bool

    init?(_ j: [String: Any]) {
        guard let kid = j["kid"] as? String, let account = j["account"] as? String, let gen = j["gen"] as? Int,
              let x = (j["x"] as? String).flatMap({ Data(base64Encoded: $0) }), x.count == 32,
              let ed = (j["ed"] as? String).flatMap({ Data(base64Encoded: $0) }), ed.count == 32,
              let sig = (j["sig"] as? String).flatMap({ Data(base64Encoded: $0) }),
              E2EECrypto.kid(x: x, ed: ed) == kid,
              let pub = try? Curve25519.Signing.PublicKey(rawRepresentation: ed),
              pub.isValidSignature(sig, for: E2EECrypto.statement(account: account, gen: gen, x: x, ed: ed))
        else { return nil }
        self.kid = kid
        self.account = account
        self.gen = gen
        self.x = x
        self.ed = ed
        prev = (j["prev"] as? String).flatMap { Data(base64Encoded: $0) }
        chain = (j["chain"] as? String).flatMap { Data(base64Encoded: $0) }
        merged = j["merged"] as? Bool ?? false
    }

    /// Signed by the generation before it, so whoever trusted that one trusts this one.
    func follows(_ older: E2EEKey) -> Bool {
        guard let prev, older.account == account, older.gen == gen - 1,
              let pub = try? Curve25519.Signing.PublicKey(rawRepresentation: older.ed) else { return false }
        return pub.isValidSignature(prev, for: E2EECrypto.statement(account: account, gen: gen, x: x, ed: ed))
    }

    /// The account's key in use (its newest own generation), and the first key of the signed chain it's on.
    static func current(_ keys: [E2EEKey], of account: String) -> (key: E2EEKey, root: E2EEKey)? {
        let own = keys.filter { $0.account == account && !$0.merged }.sorted { $0.gen > $1.gen }
        guard let top = own.first else { return nil }
        var root = top
        while let older = own.first(where: { $0.gen == root.gen - 1 }), root.follows(older) { root = older }
        return (top, root)
    }
}

/// What this computer keeps secret, in one file per API (KeyFile).
struct E2EEVault: Codable {
    var account: String?
    var device: String?
    /// This computer's own X25519 key.
    var devicePriv: Data?
    /// The account keys' secrets this computer has, by kid (every generation, and merged accounts' keys).
    var seeds: [String: Data] = [:]
    /// The recovery key, when it was made or typed on this computer.
    var recovery: String?
    /// The user saw it (the reminder to save it stops).
    var recoverySeen = false
}

@MainActor
final class E2EE {
    static let shared = E2EE()

    enum Phase: String { case off, starting, ready, locked }

    /// Where the secret part lives (a file of the app's own, KeyFile, one per API; a probe gives it one in memory).
    var vaultIO: (load: () -> Data?, save: (Data) -> Void) = (
        { KeyFile.load("messages-" + Cloud.shared.apiName) },
        { KeyFile.save("messages-" + Cloud.shared.apiName, $0) }
    )
    /// Friends' pinned keys (not secret), next to the app's other files.
    lazy var pinsURL: URL = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: NSHomeDirectory() + "/Library/Application Support"))
        .appendingPathComponent("atalay-terminal/e2ee-friends-" + Cloud.shared.apiName + ".json")
    /// How the API is called (Cloud's, with the token; a probe gives its own).
    var api: (String, String, Any?) async -> Any = { await Cloud.shared.social($0, $1, body: $2) }
    /// The pages hear about changes (an event of their own on the live line's way).
    var onState: ((String) -> Void)?

    private(set) var phase = Phase.off
    private var vault = E2EEVault()
    private var vaultLoaded = false
    /// GET /v1/e2ee/me, as last seen.
    private var me: [String: Any] = [:]
    private var ownKeys: [E2EEKey] = []
    private var friendKeys: [String: [E2EEKey]] = [:]
    private var refreshing: Task<Void, Never>?
    private var again = false
    private var lastState = ""

    struct Pin: Codable {
        var root: String
        var verified = false
        var changed = false
    }
    private var pins: [String: Pin] = [:]
    private var pinsLoaded = false

    // MARK: the vault

    private func loadVault() {
        guard !vaultLoaded else { return }
        vaultLoaded = true
        if let data = vaultIO.load(), let v = try? JSONDecoder().decode(E2EEVault.self, from: data) { vault = v }
    }

    private func saveVault() {
        if let data = try? JSONEncoder().encode(vault) { vaultIO.save(data) }
    }

    private func loadPins() {
        guard !pinsLoaded else { return }
        pinsLoaded = true
        if let data = try? Data(contentsOf: pinsURL), let p = try? JSONDecoder().decode([String: Pin].self, from: data) { pins = p }
    }

    private func savePins() {
        guard let data = try? JSONEncoder().encode(pins) else { return }
        try? FileManager.default.createDirectory(at: pinsURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? data.write(to: pinsURL, options: [.atomic])
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: pinsURL.path)
    }

    private var devicePriv: Curve25519.KeyAgreement.PrivateKey? {
        vault.devicePriv.flatMap { try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: $0) }
    }

    private func key(_ kid: String) -> E2EEAccountKey? {
        guard let seed = vault.seeds[kid], let k = try? E2EEAccountKey(seed: seed), k.kid == kid else { return nil }
        return k
    }

    private var account: String { me["account"] as? String ?? "" }
    private var device: String { me["device"] as? String ?? "" }
    private var current: E2EEKey? { E2EEKey.current(ownKeys, of: account)?.key }

    // Contexts the seals are bound to.
    private func boxContext(_ k: E2EEKey, _ device: String) -> String { "box\n\(k.account)\n\(k.kid)\n\(device)" }
    private func backupContext(_ k: E2EEKey) -> String { "backup\n\(k.account)\n\(k.kid)" }
    private func importContext(_ kid: String, _ to: String) -> String { "import\n\(kid)\n\(to)" }
    private func chainContext(_ k: E2EEKey) -> String { "chain\n\(k.account)\n\(k.kid)" }

    // MARK: calls

    private var lastError: String?

    /// An API call's answer as an object, nil on an error (kept in lastError).
    private func call(_ method: String, _ path: String, _ body: Any? = nil) async -> [String: Any]? {
        let r = await api(method, path, body) as? [String: Any]
        lastError = r == nil ? "offline" : r?["error"] as? String
        return lastError == nil ? r : nil
    }

    // MARK: keeping up

    /// Brings the keys up to date (after start, a reconnect, a change on another computer). Calls while one runs make it
    /// run once more after.
    func wake() {
        if refreshing != nil { again = true; return }
        refreshing = Task { @MainActor in
            repeat {
                again = false
                await refreshNow()
            } while again
            refreshing = nil
        }
    }

    /// Waits for the keys to be known, starting on them if nothing did yet.
    func settle() async {
        if refreshing == nil, phase == .off || phase == .starting { wake() }
        if let r = refreshing { await r.value }
    }

    private func refreshNow() async {
        loadVault()
        loadPins()
        if phase == .off { phase = .starting }
        defer { publish() }
        guard var view = await call("GET", "v1/e2ee/me") else { return }
        let account = view["account"] as? String ?? "", device = view["device"] as? String ?? ""
        guard !account.isEmpty, !device.isEmpty else { return }
        if vault.device != device {
            // This computer is someone new (signed out, or its token lost): nothing of the old account stays here.
            vault = E2EEVault(account: account, device: device)
            vault.devicePriv = Curve25519.KeyAgreement.PrivateKey().rawRepresentation
            saveVault()
            friendKeys = [:]
        } else if vault.account != account {
            // Its account joined another one: the keys it had came along there (merged), so they stay. The recovery key it
            // had was the account's it left: that one's recovery copy is gone, so it would open nothing here.
            vault.account = account
            vault.recovery = nil
            vault.recoverySeen = false
            saveVault()
            friendKeys = [:]
        }
        if devicePriv == nil {
            vault.devicePriv = Curve25519.KeyAgreement.PrivateKey().rawRepresentation
            saveVault()
        }
        guard let dpriv = devicePriv else { return }
        let dpub = dpriv.publicKey.rawRepresentation.base64EncodedString()
        let mine = (view["devices"] as? [[String: Any]])?.first { $0["me"] as? Bool == true }
        if mine?["pub"] as? String != dpub {
            guard let v = await call("PUT", "v1/e2ee/device", ["pub": dpub]) else { return }
            view = v
        }
        me = view
        ownKeys = (view["keys"] as? [[String: Any]] ?? []).compactMap(E2EEKey.init)
        if current == nil {
            if let v = await start(dpub: dpriv.publicKey.rawRepresentation) {
                view = v
            } else if lastError == "gen_taken", let v = await call("GET", "v1/e2ee/me") {
                // Another computer of the account made it at the same moment: that one is the key.
                view = v
            } else { return }
            me = view
            ownKeys = (view["keys"] as? [[String: Any]] ?? []).compactMap(E2EEKey.init)
        }
        guard let current else { return }
        unlockAll(view, dpriv: dpriv)
        phase = key(current.kid) != nil ? .ready : .locked
        guard phase == .ready else { return }
        // A computer that had the key left the account: a new generation, for the ones still on it.
        if view["rotate"] as? Bool == true, let v = await rotate(current, view: view) {
            me = v
            ownKeys = (v["keys"] as? [[String: Any]] ?? []).compactMap(E2EEKey.init)
            view = v
            unlockAll(v, dpriv: dpriv)
        }
        await keepBackup(view)
        await shareMerged(view)
    }

    /// The account's first key: made here, sealed for this computer and for a new recovery key.
    private func start(dpub: Data) async -> [String: Any]? {
        guard let k = try? E2EEAccountKey(seed: E2EECrypto.random(32)) else { return nil }
        let recovery = E2EECrypto.random(20)
        guard let rpub = try? E2EECrypto.recoveryKey(recovery).publicKey.rawRepresentation else { return nil }
        // Kept before it's sent: an answer lost on the way must not leave the account with a key nobody has.
        vault.seeds[k.kid] = k.seed
        vault.recovery = E2EECrypto.recoveryText(recovery)
        vault.recoverySeen = false
        saveVault()
        return await publishKey(k, gen: 1, prev: nil, chain: nil, devices: [(device, dpub)], backupPub: rpub, newBackup: true)
    }

    /// Sends a new generation: signed by itself (and by the one before, if any), sealed for these computers and for the
    /// recovery key.
    private func publishKey(_ k: E2EEAccountKey, gen: Int, prev: E2EEAccountKey?, chain: Data?, devices: [(String, Data)],
                            backupPub: Data?, newBackup: Bool) async -> [String: Any]? {
        let said = E2EECrypto.statement(account: account, gen: gen, x: k.xPub, ed: k.edPub)
        guard let sig = try? k.ed.signature(for: said) else { return nil }
        var boxes: [[String: String]] = []
        for (id, devicePub) in devices {
            guard let box = try? E2EECrypto.seal(k.seed, to: devicePub, context: "box\n\(account)\n\(k.kid)\n\(id)") else { continue }
            boxes.append(["device": id, "box": box.base64EncodedString()])
        }
        var body: [String: Any] = ["kid": k.kid, "gen": gen, "x": k.xPub.base64EncodedString(), "ed": k.edPub.base64EncodedString(),
                                   "sig": sig.base64EncodedString(), "boxes": boxes]
        if let prev, let s = try? prev.ed.signature(for: said) { body["prev"] = s.base64EncodedString() }
        if let chain { body["chain"] = chain.base64EncodedString() }
        if let backupPub, let box = try? E2EECrypto.seal(k.seed, to: backupPub, context: "backup\n\(account)\n\(k.kid)") {
            body["backup"] = newBackup ? ["pub": backupPub.base64EncodedString(), "box": box.base64EncodedString()] : ["box": box.base64EncodedString()]
        }
        return await call("POST", "v1/e2ee/keys", body)
    }

    /// Every key this computer can get at: the current one from its box, older generations through their chains, keys
    /// that came with a merge through what's sealed for them.
    private func unlockAll(_ view: [String: Any], dpriv: Curve25519.KeyAgreement.PrivateKey) {
        var changed = false
        for b in view["boxes"] as? [[String: Any]] ?? [] {
            guard let kid = b["kid"] as? String, vault.seeds[kid] == nil, let k = ownKeys.first(where: { $0.kid == kid }),
                  let box = (b["box"] as? String).flatMap({ Data(base64Encoded: $0) }),
                  let seed = try? E2EECrypto.open(box, with: dpriv, context: boxContext(k, device)),
                  (try? E2EEAccountKey(seed: seed))?.kid == kid else { continue }
            vault.seeds[kid] = seed
            changed = true
        }
        let imports = view["imports"] as? [[String: Any]] ?? []
        var more = true
        while more {
            more = false
            for k in ownKeys where k.chain != nil {
                guard let newer = key(k.kid), let chain = k.chain,
                      let older = ownKeys.first(where: { $0.account == k.account && $0.gen == k.gen - 1 }), vault.seeds[older.kid] == nil,
                      let seed = try? E2EECrypto.unlock(chain, with: newer.chain, context: chainContext(k)),
                      (try? E2EEAccountKey(seed: seed))?.kid == older.kid else { continue }
                vault.seeds[older.kid] = seed
                changed = true
                more = true
            }
            for i in imports {
                guard let kid = i["kid"] as? String, let to = i["to"] as? String, vault.seeds[kid] == nil, let holder = key(to),
                      let box = (i["box"] as? String).flatMap({ Data(base64Encoded: $0) }),
                      let seed = try? E2EECrypto.open(box, with: holder.x, context: importContext(kid, to)),
                      (try? E2EEAccountKey(seed: seed))?.kid == kid else { continue }
                vault.seeds[kid] = seed
                changed = true
                more = true
            }
        }
        if changed { saveVault() }
    }

    /// A new generation after a computer left: sealed for the computers still on the account that had the key.
    private func rotate(_ old: E2EEKey, view: [String: Any]) async -> [String: Any]? {
        guard let oldKey = key(old.kid), let next = try? E2EEAccountKey(seed: E2EECrypto.random(32)) else { return nil }
        let devices = (view["devices"] as? [[String: Any]] ?? []).compactMap { d -> (String, Data)? in
            guard let id = d["id"] as? String, d["approved"] as? Bool == true || d["me"] as? Bool == true,
                  let pub = (d["pub"] as? String).flatMap({ Data(base64Encoded: $0) }) else { return nil }
            return (id, pub)
        }
        guard let chain = try? E2EECrypto.lock(oldKey.seed, with: next.chain, context: "chain\n\(account)\n\(next.kid)") else { return nil }
        let backupPub = ((view["backup"] as? [String: Any])?["pub"] as? String).flatMap { Data(base64Encoded: $0) }
        vault.seeds[next.kid] = next.seed
        saveVault()
        if let v = await publishKey(next, gen: old.gen + 1, prev: oldKey, chain: chain, devices: devices, backupPub: backupPub, newBackup: false) { return v }
        // Another computer turned it at the same moment: theirs is the one.
        return lastError == "gen_taken" ? await call("GET", "v1/e2ee/me") : nil
    }

    /// The recovery copy follows the current key; an account without one gets one (the user is asked to save it).
    private func keepBackup(_ view: [String: Any]) async {
        guard let current, let k = key(current.kid) else { return }
        if let b = view["backup"] as? [String: Any], let pub = (b["pub"] as? String).flatMap({ Data(base64Encoded: $0) }) {
            guard !(b["kids"] as? [String] ?? []).contains(current.kid),
                  let box = try? E2EECrypto.seal(k.seed, to: pub, context: backupContext(current)) else { return }
            _ = await call("PUT", "v1/e2ee/backup", ["pub": pub.base64EncodedString(), "boxes": [["kid": current.kid, "box": box.base64EncodedString()]]])
            return
        }
        _ = await newRecovery()
    }

    /// Keys that came with a merge and that this computer holds: sealed to the account's current key, so the account's
    /// other computers open what they sealed too.
    private func shareMerged(_ view: [String: Any]) async {
        guard let current, let to = key(current.kid) else { return }
        let have = Set((view["imports"] as? [[String: Any]] ?? []).compactMap { $0["kid"] as? String })
        var imports: [[String: String]] = []
        for k in ownKeys where k.merged && !have.contains(k.kid) {
            guard let seed = vault.seeds[k.kid],
                  let box = try? E2EECrypto.seal(seed, to: to.xPub, context: importContext(k.kid, current.kid)) else { continue }
            imports.append(["kid": k.kid, "to": current.kid, "box": box.base64EncodedString()])
        }
        if !imports.isEmpty { _ = await call("POST", "v1/e2ee/imports", ["imports": imports]) }
    }

    // MARK: recovery

    /// A new recovery key: what the old one opened is no longer kept for it.
    func newRecovery() async -> String? {
        guard let current, let k = key(current.kid) else { return nil }
        let bytes = E2EECrypto.random(20)
        guard let pub = try? E2EECrypto.recoveryKey(bytes).publicKey.rawRepresentation,
              let box = try? E2EECrypto.seal(k.seed, to: pub, context: backupContext(current)) else { return nil }
        guard await call("PUT", "v1/e2ee/backup", ["pub": pub.base64EncodedString(), "boxes": [["kid": current.kid, "box": box.base64EncodedString()]]]) != nil
        else { return nil }
        vault.recovery = E2EECrypto.recoveryText(bytes)
        vault.recoverySeen = false
        saveVault()
        publish()
        return vault.recovery
    }

    /// Opens the account's keys with the recovery key (a computer nobody else can approve). nil when it worked, else
    /// what went wrong for the page.
    func recover(_ text: String) async -> String? {
        await settle()
        guard let bytes = E2EECrypto.recoveryBytes(text), let rkey = try? E2EECrypto.recoveryKey(bytes) else { return "bad_recovery" }
        guard let b = await call("GET", "v1/e2ee/backup") else { return lastError == "no_backup" ? "no_backup" : lastError ?? "offline" }
        guard b["pub"] as? String == rkey.publicKey.rawRepresentation.base64EncodedString() else { return "wrong_recovery" }
        var opened = false
        for box in b["boxes"] as? [[String: Any]] ?? [] {
            guard let kid = box["kid"] as? String, let k = ownKeys.first(where: { $0.kid == kid }),
                  let data = (box["box"] as? String).flatMap({ Data(base64Encoded: $0) }),
                  let seed = try? E2EECrypto.open(data, with: rkey, context: backupContext(k)),
                  (try? E2EEAccountKey(seed: seed))?.kid == kid else { continue }
            vault.seeds[kid] = seed
            opened = true
        }
        guard opened else { return "wrong_recovery" }
        vault.recovery = E2EECrypto.recoveryText(bytes)
        vault.recoverySeen = true
        saveVault()
        // Sealed for this computer too, so the account counts it among the approved ones (a new generation reaches it).
        if let current, let k = key(current.kid), let dpriv = devicePriv,
           let box = try? E2EECrypto.seal(k.seed, to: dpriv.publicKey.rawRepresentation, context: boxContext(current, device)) {
            _ = await call("POST", "v1/e2ee/boxes", ["boxes": [["kid": current.kid, "device": device, "box": box.base64EncodedString()]]])
        }
        wake()
        await settle()
        return nil
    }

    /// Every computer and the recovery key lost: a new key with nothing behind it. Messages sealed before stay closed;
    /// friends see the security code change.
    func startOver() async -> String? {
        await settle()
        guard let dpriv = devicePriv, let k = try? E2EEAccountKey(seed: E2EECrypto.random(32)) else { return "offline" }
        let gen = (ownKeys.filter { !$0.merged && $0.account == account }.map(\.gen).max() ?? 0) + 1
        let recovery = E2EECrypto.random(20)
        guard let rpub = try? E2EECrypto.recoveryKey(recovery).publicKey.rawRepresentation else { return "offline" }
        vault.seeds[k.kid] = k.seed
        vault.recovery = E2EECrypto.recoveryText(recovery)
        vault.recoverySeen = false
        saveVault()
        guard await publishKey(k, gen: gen, prev: nil, chain: nil, devices: [(device, dpriv.publicKey.rawRepresentation)], backupPub: rpub, newBackup: true) != nil
        else { return lastError ?? "offline" }
        wake()
        await settle()
        return nil
    }

    func recoverySeen() {
        vault.recoverySeen = true
        saveVault()
        publish()
    }

    var recoveryKey: String? { vault.recovery }

    // MARK: friends' keys

    /// A friend's keys, checked, fetched again when `kid` isn't among the ones known. The first ones seen are pinned; a
    /// new chain their old key didn't sign marks their security code changed.
    private func friendKeys(_ id: String, need kid: String? = nil, fresh: Bool = false) async -> [E2EEKey]? {
        if !fresh, let known = friendKeys[id], kid.map({ k in known.contains { $0.kid == k } }) ?? true { return known }
        // The id goes into the path: only an account id (a UUID) may, so a page can't steer this call elsewhere.
        guard UUID(uuidString: id) != nil else { return nil }
        guard let r = await call("GET", "v1/e2ee/keys/\(id)") else { return friendKeys[id] }
        let keys = (r["keys"] as? [[String: Any]] ?? []).compactMap(E2EEKey.init)
        friendKeys[id] = keys
        loadPins()
        if let (_, root) = E2EEKey.current(keys, of: id) {
            if var pin = pins[id] {
                if pin.root != root.kid {
                    pin.root = root.kid
                    pin.changed = true
                    pin.verified = false
                    pins[id] = pin
                    savePins()
                    publish()
                }
            } else {
                pins[id] = Pin(root: root.kid)
                savePins()
            }
        }
        return keys
    }

    // MARK: messages

    /// A message as the page shows it: sealed ones opened (`enc` true), or marked `locked` (this computer doesn't have
    /// the key) or `bad` (it doesn't open: changed on the way). Plain ones (`enc` false) as they are.
    func open(_ m: [String: Any], friend: String) async -> [String: Any] {
        var out = m
        for k in ["ct", "sk", "rk", "v"] { out.removeValue(forKey: k) }
        guard m["v"] as? Int == 1 else {
            out["enc"] = false
            return out
        }
        out["enc"] = "locked"
        out["body"] = ""
        guard let ct = m["ct"] as? String, let sk = m["sk"] as? String, let rk = m["rk"] as? String, let uuid = m["uuid"] as? String else {
            out["enc"] = "bad"
            return out
        }
        let mine = m["mine"] as? Bool ?? false
        let myKid = mine ? sk : rk, theirKid = mine ? rk : sk
        if key(myKid) == nil { await settle() }
        guard let myKey = key(myKid), let theirs = await friendKeys(friend, need: theirKid)?.first(where: { $0.kid == theirKid }) else { return out }
        do {
            let conv = try E2EECrypto.conversation(myKey, theirX: theirs.x)
            let plain = try E2EECrypto.openMessage(ct, conversation: conv, uuid: uuid, sk: sk, rk: rk)
            guard let env = try JSONSerialization.jsonObject(with: plain) as? [String: Any], let text = env["t"] as? String else { throw E2EECrypto.Failure.bad }
            out["body"] = text
            if let r = env["r"] as? [String: Any], let ru = r["u"] as? String {
                out["reply"] = ["uuid": ru, "who": (r["o"] as? String == "s") == mine ? "me" : "them", "text": r["s"] as? String ?? ""]
            }
            out["enc"] = true
        } catch {
            out["enc"] = "bad"
        }
        return out
    }

    /// Sends a message the page wrote (POST v1/messages: `to`, `body`, `uuid`, `reply` {uuid, mine, text}): sealed when
    /// the friend has a key, plain when they don't have one yet (their app is older). Never plain to a friend whose key
    /// was seen before, and nothing goes from a computer the account hasn't approved.
    func send(_ b: [String: Any]) async -> Any {
        guard let to = b["to"] as? String else { return ["error": "bad_message"] }
        let text = (b["body"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return ["error": "empty"] }
        let uuid = (b["uuid"] as? String)?.lowercased() ?? UUID().uuidString.lowercased()
        let reply = b["reply"] as? [String: Any]
        let snippet = String((reply?["text"] as? String ?? "").replacingOccurrences(of: "\n", with: " ").prefix(100))
        await settle()
        for attempt in 0 ..< 2 {
            guard let keys = await friendKeys(to, fresh: attempt > 0) else { return ["error": lastError ?? "offline"] }
            let theirs = E2EEKey.current(keys, of: to)?.key
            var r: Any
            if let theirs {
                guard phase == .ready, let cur = current, let mine = key(cur.kid) else { return ["error": phase == .locked ? "locked" : "e2ee_starting"] }
                var env: [String: Any] = ["t": text]
                if let reply, let ru = reply["uuid"] as? String {
                    env["r"] = ["u": ru, "o": reply["mine"] as? Bool == true ? "s" : "r", "s": snippet]
                }
                guard let plain = try? JSONSerialization.data(withJSONObject: env),
                      let conv = try? E2EECrypto.conversation(mine, theirX: theirs.x),
                      let ct = try? E2EECrypto.sealMessage(plain, conversation: conv, uuid: uuid, sk: cur.kid, rk: theirs.kid)
                else { return ["error": "seal_failed"] }
                r = await api("POST", "v1/messages", ["to": to, "v": 1, "uuid": uuid, "ct": ct, "sk": cur.kid, "rk": theirs.kid])
            } else {
                // Their key was seen before: it can't just be gone.
                if pins[to] != nil { return ["error": "key_missing"] }
                let quoted = reply != nil && !snippet.isEmpty ? "> \(snippet)\n\(text)" : text
                r = await api("POST", "v1/messages", ["to": to, "body": quoted, "uuid": uuid])
            }
            let answer = r as? [String: Any] ?? ["error": "offline"]
            // Keys turned on either side since: once more with the new ones.
            if answer["error"] as? String == "stale_key", attempt == 0 {
                wake()
                await settle()
                continue
            }
            guard let msg = answer["message"] as? [String: Any] else { return answer }
            return ["message": await open(msg, friend: to)]
        }
        return ["error": "stale_key"]
    }

    /// The pages' calls to the friends and messages endpoints go through here (CloudBridge): messages are sealed on the
    /// way out and opened on the way in; the friends list gets the last messages open and what the pages need to know
    /// about encryption.
    func social(_ method: String, _ path: String, body: Any?) async -> Any {
        if method == "POST", path == "v1/messages", let b = body as? [String: Any] { return await send(b) }
        let r = await api(method, path, body)
        guard var obj = r as? [String: Any], obj["error"] == nil else { return r }
        if method == "GET", path == "v1/social" {
            loadPins()
            var friends = obj["friends"] as? [[String: Any]] ?? []
            for i in friends.indices {
                guard let id = friends[i]["id"] as? String else { continue }
                if let last = friends[i]["last"] as? [String: Any] { friends[i]["last"] = await open(last, friend: id) }
                if let pin = pins[id] { friends[i]["sc"] = ["changed": pin.changed, "verified": pin.verified] }
            }
            obj["friends"] = friends
            if var me = obj["me"] as? [String: Any] {
                me["e2ee"] = state()
                obj["me"] = me
            }
            return obj
        }
        if method == "GET", path.hasPrefix("v1/messages/") {
            let friend = String(path.dropFirst("v1/messages/".count).prefix { $0 != "?" })
            var list: [[String: Any]] = []
            for m in obj["messages"] as? [[String: Any]] ?? [] { list.append(await open(m, friend: friend)) }
            obj["messages"] = list
            return obj
        }
        return obj
    }

    // MARK: live events

    /// A live event on its way to the pages: a message opened, key changes taken in, the notes between computers
    /// approving one another kept here. What the pages should get, in order.
    func incoming(_ json: String) async -> [String] {
        guard var ev = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any], let type = ev["type"] as? String else { return [json] }
        switch type {
        case "message":
            guard let with = ev["with"] as? String, let m = ev["message"] as? [String: Any] else { return [json] }
            ev["message"] = await open(m, friend: with)
            return [Self.text(ev)].compactMap { $0 }
        case "e2ee":
            wake()
            return []
        case "account":
            // Joined to another account, a computer added or taken off: the keys may have changed with it.
            wake()
            return [json]
        case "e2ee_keys":
            if let id = ev["id"] as? String { _ = await friendKeys(id, fresh: true) }
            return [json]
        case "e2ee_relay":
            if let from = ev["from"] as? String, let msg = ev["msg"] as? [String: String] { await relayed(msg, from: from) }
            return []
        case "hello":
            wake()
            return [json]
        default:
            return [json]
        }
    }

    static func text(_ obj: Any) -> String? {
        guard let data = try? JSONSerialization.data(withJSONObject: obj, options: [.withoutEscapingSlashes]) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: what the pages see

    /// Computers of the account waiting to be approved (they have a key of their own, not the account's).
    private var waiting: [[String: Any]] {
        (me["devices"] as? [[String: Any]] ?? []).filter { $0["me"] as? Bool != true && $0["pub"] is String && $0["approved"] as? Bool != true }
            .map { ["id": $0["id"] ?? "", "os": $0["os"] ?? NSNull(), "app": $0["app"] ?? NSNull()] }
    }

    func state() -> [String: Any] {
        var friends: [String: Any] = [:]
        for (id, p) in pins where p.changed || p.verified { friends[id] = ["changed": p.changed, "verified": p.verified] }
        return [
            "phase": phase.rawValue,
            // new: made here and not seen yet; saved: seen, or typed here; elsewhere: on another computer
            "recovery": vault.recovery == nil ? "elsewhere" : vault.recoverySeen ? "saved" : "new",
            "waiting": phase == .ready ? waiting : [],
            "sas": sas.map(sasState) ?? NSNull(),
            "friends": friends,
        ]
    }

    private func publish() {
        var s = state()
        s["type"] = "e2ee_state"
        guard let json = Self.text(s), json != lastState else { return }
        lastState = json
        onState?(json)
    }

    /// A friend's security code, and whether the user marked it checked.
    func securityCode(_ friend: String) async -> [String: Any] {
        await settle()
        guard let mine = E2EEKey.current(ownKeys, of: account)?.root,
              let keys = await friendKeys(friend), let theirs = E2EEKey.current(keys, of: friend)?.root else { return ["error": "no_key"] }
        let code = E2EECrypto.securityCode((account, mine.x, mine.ed), (friend, theirs.x, theirs.ed))
        return ["code": code, "verified": pins[friend]?.verified ?? false]
    }

    func setVerified(_ friend: String, _ on: Bool) {
        loadPins()
        guard var p = pins[friend] else { return }
        p.verified = on
        p.changed = false
        pins[friend] = p
        savePins()
        publish()
    }

    /// The "security code changed" line was read.
    func seenChange(_ friend: String) {
        loadPins()
        guard var p = pins[friend], p.changed else { return }
        p.changed = false
        pins[friend] = p
        savePins()
        publish()
    }

    // MARK: approving a computer

    /// Two computers of the account compare a code before one gives the other the account key. Each makes a one-time
    /// key; the one asked first commits to its own (a hash) before it sees the other's, so nobody in between can pick a
    /// key that makes the codes match. The code comes from both one-time keys, both computers and the new computer's
    /// own key: the user checks that both screens show the same one, on both screens.
    struct SAS {
        let sid: String
        let peer: String
        /// This computer gives the key (it was approved already).
        let giver: Bool
        let once = Curve25519.KeyAgreement.PrivateKey()
        var theirs: Data?
        var commit: String?
        var code: String?
        var mac: SymmetricKey?
        var confirmed = false
        var gift: [String: String]?
        /// waiting · compare · done · failed
        var step = "waiting"
        var note = ""
        let at = Date()
        var os: Any = NSNull()
        var app: Any = NSNull()
    }

    private(set) var sas: SAS?
    private var sasTimer: Task<Void, Never>?

    private func sasState(_ s: SAS) -> [String: Any] {
        ["sid": s.sid, "giver": s.giver, "step": s.step, "code": s.code ?? NSNull(), "note": s.note, "os": s.os, "app": s.app]
    }

    private func relay(_ to: String, _ msg: [String: String]) async -> Bool {
        await call("POST", "v1/e2ee/relay", ["to": to, "msg": msg]) != nil
    }

    private func peerInfo(_ id: String) -> [String: Any]? {
        (me["devices"] as? [[String: Any]])?.first { $0["id"] as? String == id }
    }

    /// The user asked to approve another computer of the account (from its notice or Settings).
    func approve(_ peer: String) async -> String? {
        await settle()
        guard phase == .ready else { return "locked" }
        guard let info = peerInfo(peer), info["pub"] is String else { return "not_found" }
        var s = SAS(sid: E2EECrypto.random(12).base64EncodedString(), peer: peer, giver: true)
        s.os = info["os"] ?? NSNull()
        s.app = info["app"] ?? NSNull()
        sas = s
        publish()
        expireSoon(s.sid)
        guard await relay(peer, ["t": "start", "s": s.sid]) else {
            fail(s.sid, lastError == "offline" ? "that computer isn't connected · open the app on it" : "couldn't reach that computer")
            return nil
        }
        return nil
    }

    private func expireSoon(_ sid: String) {
        sasTimer?.cancel()
        sasTimer = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 300 * 1_000_000_000)
            guard !Task.isCancelled, let s = self.sas, s.sid == sid, s.step != "done", s.step != "failed" else { return }
            self.fail(sid, "it took too long · try again")
        }
    }

    private func fail(_ sid: String, _ note: String) {
        guard var s = sas, s.sid == sid else { return }
        s.step = "failed"
        s.note = note
        sas = s
        publish()
        clearSoon(sid)
    }

    private func clearSoon(_ sid: String) {
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 8 * 1_000_000_000)
            if self.sas?.sid == sid { self.sas = nil; self.publish() }
        }
    }

    /// The information both sides put into the code, in the same order.
    private func sasInfo(_ s: SAS, giverOnce: Data, takerOnce: Data, takerPub: String) -> String {
        let (giver, taker) = s.giver ? (device, s.peer) : (s.peer, device)
        return "\(s.sid)\n\(giver)\n\(taker)\n\(giverOnce.base64EncodedString())\n\(takerOnce.base64EncodedString())\n\(takerPub)\n\(account)"
    }

    private func makeCode(_ s: inout SAS) -> Bool {
        guard let theirs = s.theirs, let pub = try? Curve25519.KeyAgreement.PublicKey(rawRepresentation: theirs),
              let shared = try? s.once.sharedSecretFromKeyAgreement(with: pub) else { return false }
        let mine = s.once.publicKey.rawRepresentation
        let takerPub: String
        if s.giver {
            guard let p = peerInfo(s.peer)?["pub"] as? String else { return false }
            takerPub = p
        } else {
            guard let p = devicePriv?.publicKey.rawRepresentation.base64EncodedString() else { return false }
            takerPub = p
        }
        let info = s.giver ? sasInfo(s, giverOnce: mine, takerOnce: theirs, takerPub: takerPub) : sasInfo(s, giverOnce: theirs, takerOnce: mine, takerPub: takerPub)
        let (code, mac) = E2EECrypto.compareCode(shared, info: info)
        s.code = code
        s.mac = mac
        s.step = "compare"
        return true
    }

    /// A note from another computer of the account.
    private func relayed(_ msg: [String: String], from: String) async {
        guard let t = msg["t"], let sid = msg["s"] else { return }
        if t == "start" {
            // Asked to compare codes: only a computer still waiting for the key answers.
            await settle()
            guard phase == .locked, peerInfo(from) != nil else { return }
            var s = SAS(sid: sid, peer: from, giver: false)
            s.os = peerInfo(from)?["os"] ?? NSNull()
            s.app = peerInfo(from)?["app"] ?? NSNull()
            let commit = E2EECrypto.hex(SHA256.hash(data: s.once.publicKey.rawRepresentation + Data(sid.utf8)))
            sas = s
            publish()
            expireSoon(sid)
            _ = await relay(from, ["t": "commit", "s": sid, "c": commit])
            return
        }
        guard var s = sas, s.sid == sid, s.peer == from, s.step != "done", s.step != "failed" else { return }
        switch t {
        case "commit" where s.giver && s.commit == nil:
            s.commit = msg["c"]
            sas = s
            _ = await relay(from, ["t": "key", "s": sid, "k": s.once.publicKey.rawRepresentation.base64EncodedString()])
        case "key" where s.theirs == nil:
            guard let k = msg["k"].flatMap({ Data(base64Encoded: $0) }), k.count == 32 else { return fail(sid, "something went wrong · try again") }
            if s.giver {
                // The other side's key must be the one it committed to.
                guard E2EECrypto.hex(SHA256.hash(data: k + Data(sid.utf8))) == s.commit else { return fail(sid, "something went wrong · try again") }
                s.theirs = k
            } else {
                s.theirs = k
                _ = await relay(from, ["t": "key", "s": sid, "k": s.once.publicKey.rawRepresentation.base64EncodedString()])
            }
            guard makeCode(&s) else { return fail(sid, "something went wrong · try again") }
            sas = s
            publish()
        case "ok" where !s.giver:
            s.gift = msg
            sas = s
            if s.confirmed { await take(sid) }
        case "cancel":
            fail(sid, "not approved · the codes didn't match")
        default:
            break
        }
    }

    /// The user compared the codes: `match` false stops it on both computers.
    func confirm(_ sid: String, match: Bool) async {
        guard var s = sas, s.sid == sid, s.step == "compare" else { return }
        guard match else {
            _ = await relay(s.peer, ["t": "cancel", "s": sid])
            return fail(sid, "not approved · the codes didn't match")
        }
        s.confirmed = true
        sas = s
        if s.giver {
            await give(sid)
        } else if s.gift != nil {
            await take(sid)
        } else {
            s.note = "waiting for your other computer…"
            sas = s
            publish()
        }
    }

    /// The approving computer: the account key sealed for the other computer, kept on the server and sent with a
    /// signature only these two can make.
    private func give(_ sid: String) async {
        guard let s = sas, s.sid == sid, let current, let k = key(current.kid), let mac = s.mac,
              let pub = (peerInfo(s.peer)?["pub"] as? String).flatMap({ Data(base64Encoded: $0) }),
              let box = try? E2EECrypto.seal(k.seed, to: pub, context: boxContext(current, s.peer)) else { return fail(sid, "something went wrong · try again") }
        let b64 = box.base64EncodedString()
        let tag = Data(HMAC<SHA256>.authenticationCode(for: Data((current.kid + "\n" + b64).utf8), using: mac)).base64EncodedString()
        guard await call("POST", "v1/e2ee/boxes", ["boxes": [["kid": current.kid, "device": s.peer, "box": b64]]]) != nil else {
            return fail(sid, "couldn't reach the server · try again")
        }
        _ = await relay(s.peer, ["t": "ok", "s": sid, "kid": current.kid, "box": b64, "mac": tag])
        done(sid, "approved · your messages are on that computer now")
    }

    /// The approved computer: takes the key once the user here said the codes match too.
    private func take(_ sid: String) async {
        guard let s = sas, s.sid == sid, let gift = s.gift, let mac = s.mac, let kid = gift["kid"], let b64 = gift["box"], let tag = gift["mac"],
              let want = Data(base64Encoded: tag),
              HMAC<SHA256>.isValidAuthenticationCode(want, authenticating: Data((kid + "\n" + b64).utf8), using: mac) else {
            return fail(sid, "something went wrong · try again")
        }
        wake()
        await settle()
        guard let k = ownKeys.first(where: { $0.kid == kid }), let dpriv = devicePriv,
              let box = Data(base64Encoded: b64),
              let seed = try? E2EECrypto.open(box, with: dpriv, context: boxContext(k, device)),
              (try? E2EEAccountKey(seed: seed))?.kid == kid else { return fail(sid, "something went wrong · try again") }
        vault.seeds[kid] = seed
        saveVault()
        wake()
        await settle()
        done(sid, "approved · your messages are here now")
    }

    private func done(_ sid: String, _ note: String) {
        guard var s = sas, s.sid == sid else { return }
        s.step = "done"
        s.note = note
        sas = s
        sasTimer?.cancel()
        publish()
        clearSoon(sid)
    }

    // MARK: the pages' calls

    /// Settings, the chat window and the notices ask through the cloud bridge ({ type: "e2ee", action, … }).
    func page(_ b: [String: Any]) async -> Any {
        switch b["action"] as? String {
        case "state":
            await settle()
            return state()
        case "recovery":
            if b["seen"] as? Bool == true { recoverySeen() }
            return ["key": vault.recovery.map { $0 as Any } ?? NSNull()]
        case "newRecovery":
            guard let k = await newRecovery() else { return ["error": lastError ?? "offline"] }
            return ["key": k]
        case "recover":
            if let e = await recover(b["key"] as? String ?? "") { return ["error": e] }
            return ["ok": true]
        case "startOver":
            if let e = await startOver() { return ["error": e] }
            return ["ok": true]
        case "approve":
            if let e = await approve(b["device"] as? String ?? "") { return ["error": e] }
            return ["ok": true]
        case "confirm":
            await confirm(b["sid"] as? String ?? "", match: b["match"] as? Bool ?? false)
            return ["ok": true]
        case "code":
            return await securityCode(b["id"] as? String ?? "")
        case "verify":
            setVerified(b["id"] as? String ?? "", b["on"] as? Bool ?? true)
            return ["ok": true]
        case "seen":
            seenChange(b["id"] as? String ?? "")
            return ["ok": true]
        default:
            return ["error": "bad_action"]
        }
    }
}
