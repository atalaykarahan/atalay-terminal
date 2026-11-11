import Foundation

/// The app's own secrets on this Mac (the notes' key, the message keys): files in its folder that only this user can
/// read, as the device token is. They aren't in the Keychain, and the app never asks it for anything: macOS lets an
/// app read its own Keychain items without asking only when Apple knows who signed it. This app is signed with a
/// certificate of its own, so to macOS every update is another app, and it asked for the Mac's password, once for
/// each item, after every update.
enum KeyFile {
    /// Application Support/atalay-terminal/Keys
    static let folder: URL = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: NSHomeDirectory() + "/Library/Application Support")).appendingPathComponent("atalay-terminal/Keys")

    static func url(_ name: String) -> URL { folder.appendingPathComponent(name) }

    static func load(_ name: String) -> Data? { try? Data(contentsOf: url(name)) }

    /// Written whole or not at all (a file beside it, moved onto its name), and never readable by anyone else on the
    /// way. With `fresh`, only when there's none yet: two copies of the app starting at once keep one key, not two.
    @discardableResult
    static func save(_ name: String, _ data: Data, fresh: Bool = false) -> Bool {
        let fm = FileManager.default
        try? fm.createDirectory(at: folder, withIntermediateDirectories: true)
        try? fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: folder.path)
        let file = url(name).path
        let part = folder.appendingPathComponent(".\(name).\(getpid()).\(UInt32.random(in: 0 ... .max)).part").path
        guard fm.createFile(atPath: part, contents: data, attributes: [.posixPermissions: 0o600]) else { return false }
        defer { unlink(part) }
        // link() gives the file its name only while the name is free; rename() takes the old file's place in one step.
        return (fresh ? link(part, file) : rename(part, file)) == 0
    }
}
