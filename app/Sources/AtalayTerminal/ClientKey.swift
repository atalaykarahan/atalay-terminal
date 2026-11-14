import CryptoKit
import Foundation

/// Released builds sign every call to the API with a key the public repository never has: build-app.sh writes it from
/// ~/.atalay-terminal/client-key into ClientKey+Build.swift (gitignored) and compiles with CLIENT_KEY. The API serves
/// only the published app that way; a copy built from source can't sign, so it earns no XP and can't use friends or
/// messages (the API's src/clientauth.ts).
@MainActor
enum ClientKey {
    #if CLIENT_KEY
    /// The release's key sits among others shaped like it (build-app.sh, scripts/client-key.sh): `slot` is the key; the
    /// others are never used. The index is worked out at run time, so the compiler keeps every one of them in the
    /// program.
    private static let key: (id: String, secret: SymmetricKey)? = {
        let i = Int(CommandLine.argc) > 1_000_000 ? Int(CommandLine.argc) % embedded.count : slot
        let k = embedded[i]
        return (k.id, SymmetricKey(data: zip(k.mask, k.data).map { $0 ^ $1 }))
    }()
    #else
    private static let key: (id: String, secret: SymmetricKey)? = nil
    #endif

    /// How far the API's clock is ahead of this Mac's (from its Date header): a Mac set to the wrong time still signs
    /// with a time the API accepts.
    private static var skew: TimeInterval = 0

    private static let httpDate: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "GMT")
        f.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        return f
    }()

    private static func hex<S: Sequence>(_ bytes: S) -> String where S.Element == UInt8 {
        bytes.map { String(format: "%02x", $0) }.joined()
    }

    /// Adds x-at-key, x-at-time, x-at-nonce and x-at-sig: HMAC-SHA256 of "v2", the time, a new random nonce, the method,
    /// the path with query, the body's SHA-256 and the Authorization header's SHA-256. The API takes each nonce once and
    /// only with that token, so a call copied off the wire can't be sent again or under another account. Call it once
    /// the request has its body and token. Nothing is signed while the pages aren't this build's own (WebIntegrity).
    static func sign(_ req: inout URLRequest) {
        guard let key, WebIntegrity.intact, let url = req.url, let c = URLComponents(url: url, resolvingAgainstBaseURL: true) else { return }
        let time = String(Int(Date().timeIntervalSince1970 + skew))
        let nonce = SymmetricKey(size: .bits128).withUnsafeBytes { hex($0) }
        let target = c.percentEncodedPath + (c.percentEncodedQuery.map { "?" + $0 } ?? "")
        let auth = hex(SHA256.hash(data: Data((req.value(forHTTPHeaderField: "authorization") ?? "").utf8)))
        let text = ["v2", time, nonce, req.httpMethod ?? "GET", target, hex(SHA256.hash(data: req.httpBody ?? Data())), auth]
            .joined(separator: "\n")
        req.setValue(key.id, forHTTPHeaderField: "x-at-key")
        req.setValue(time, forHTTPHeaderField: "x-at-time")
        req.setValue(nonce, forHTTPHeaderField: "x-at-nonce")
        req.setValue(hex(HMAC<SHA256>.authenticationCode(for: Data(text.utf8), using: key.secret)), forHTTPHeaderField: "x-at-sig")
    }

    /// Keeps up with the API's clock from a reply.
    static func learn(from response: URLResponse) {
        guard let date = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Date"),
              let d = httpDate.date(from: date) else { return }
        skew = d.timeIntervalSinceNow
    }
}
