import CryptoKit
import Foundation

/// Released builds sign every call to the API with a key the public repository never has: build-app.sh writes it from
/// ~/.atalay-terminal/client-key into ClientKey+Build.swift (gitignored) and compiles with CLIENT_KEY. The API serves
/// only the published app that way; a copy built from source can't sign, so it earns no XP and can't use friends or
/// messages (the API's src/clientauth.ts).
@MainActor
enum ClientKey {
    #if CLIENT_KEY
    private static let key: (id: String, secret: SymmetricKey)? =
        (embedded.id, SymmetricKey(data: zip(embedded.mask, embedded.data).map { $0 ^ $1 }))
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

    /// Adds x-at-key, x-at-time and x-at-sig: HMAC-SHA256 of the time, method, path with query and the body's
    /// SHA-256. Call it once the request has its body.
    static func sign(_ req: inout URLRequest) {
        guard let key, let url = req.url, let c = URLComponents(url: url, resolvingAgainstBaseURL: true) else { return }
        let time = String(Int(Date().timeIntervalSince1970 + skew))
        let target = c.percentEncodedPath + (c.percentEncodedQuery.map { "?" + $0 } ?? "")
        let text = [time, req.httpMethod ?? "GET", target, hex(SHA256.hash(data: req.httpBody ?? Data()))].joined(separator: "\n")
        req.setValue(key.id, forHTTPHeaderField: "x-at-key")
        req.setValue(time, forHTTPHeaderField: "x-at-time")
        req.setValue(hex(HMAC<SHA256>.authenticationCode(for: Data(text.utf8), using: key.secret)), forHTTPHeaderField: "x-at-sig")
    }

    /// Keeps up with the API's clock from a reply.
    static func learn(from response: URLResponse) {
        guard let date = (response as? HTTPURLResponse)?.value(forHTTPHeaderField: "Date"),
              let d = httpDate.date(from: date) else { return }
        skew = d.timeIntervalSinceNow
    }
}
