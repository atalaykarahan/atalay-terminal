// Release signing for the in-app updater (Ed25519, CryptoKit).
//   swift scripts/sign.swift key           prints the public key for Info.plist (AtalayUpdateKey); creates the key once
//   swift scripts/sign.swift sign <file>   prints the base64 signature of <file>
// The private key lives in ~/.atalay-terminal/release-key (readable by you only). Never put it in a repository.
import CryptoKit
import Foundation

let keyURL = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent(".atalay-terminal/release-key")

func privateKey() throws -> Curve25519.Signing.PrivateKey {
    if let text = try? String(contentsOf: keyURL, encoding: .utf8), let raw = Data(base64Encoded: text.trimmingCharacters(in: .whitespacesAndNewlines)) {
        return try Curve25519.Signing.PrivateKey(rawRepresentation: raw)
    }
    let key = Curve25519.Signing.PrivateKey()
    try FileManager.default.createDirectory(at: keyURL.deletingLastPathComponent(), withIntermediateDirectories: true,
                                            attributes: [.posixPermissions: 0o700])
    FileManager.default.createFile(atPath: keyURL.path, contents: Data(key.rawRepresentation.base64EncodedString().utf8),
                                   attributes: [.posixPermissions: 0o600])
    return key
}

let args = Array(CommandLine.arguments.dropFirst())
switch args.first {
case "key":
    print(try privateKey().publicKey.rawRepresentation.base64EncodedString())
case "sign" where args.count == 2:
    let data = try Data(contentsOf: URL(fileURLWithPath: args[1]))
    print(try privateKey().signature(for: data).base64EncodedString())
default:
    FileHandle.standardError.write(Data("usage: swift scripts/sign.swift key | sign <file>\n".utf8))
    exit(2)
}
