import AppKit
import CryptoKit

/// Installs a newer build offered by the API in two steps. `prepare` downloads its zip, checks the SHA-256 and the
/// Ed25519 signature made with the release key (its public half is AtalayUpdateKey in Info.plist) and unpacks it next to
/// the running app: safe in the background, nothing changes yet. `apply` swaps the bundles once the app has quit, and
/// starts the new build at once or waits for the user to quit. Chats keep running in their detached sessions meanwhile
/// and come back with the new build.
@MainActor
enum Updater {
    /// A newer build, checked and unpacked next to the running app (hidden), waiting to replace it.
    struct Staged { let build: Int; let version: String; let url: URL }

    enum Failure: Error {
        case noKey, download(Int), badSignature, badBundle, cancelled
        /// The folder holding the app can't be written to (or macOS privacy settings refused it).
        case notWritable

        /// Short code the dashboard page turns into a message.
        var code: String { if case .notWritable = self { return "not_writable" }; return "failed" }
    }

    static func prepare(_ release: Release, progress: @escaping @MainActor (String) -> Void) async throws -> Staged {
        guard let raw = (Bundle.main.object(forInfoDictionaryKey: "AtalayUpdateKey") as? String).flatMap({ Data(base64Encoded: $0) }),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: raw) else { throw Failure.noKey }
        guard let url = URL(string: release.url) else { throw Failure.download(0) }
        let (file, response) = try await URLSession.shared.download(from: url)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { throw Failure.download(status) }
        let data = try Data(contentsOf: file)
        let digest = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard digest == release.sha256, let signature = Data(base64Encoded: release.signature),
              key.isValidSignature(signature, for: data) else { throw Failure.badSignature }

        progress("unpacking \(release.version)…")
        let fm = FileManager.default
        let work = fm.temporaryDirectory.appendingPathComponent("atalay-terminal-update-\(release.build)")
        try? fm.removeItem(at: work)
        try fm.createDirectory(at: work, withIntermediateDirectories: true)
        let zip = work.appendingPathComponent("update.zip")
        try data.write(to: zip)
        try run("/usr/bin/ditto", ["-x", "-k", zip.path, work.path])
        guard let app = try fm.contentsOfDirectory(at: work, includingPropertiesForKeys: nil).first(where: { $0.pathExtension == "app" }),
              let bundle = Bundle(url: app), bundle.bundleIdentifier == Bundle.main.bundleIdentifier,
              Int(bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") == release.build else { throw Failure.badBundle }

        // Put the new bundle next to the running one first, while this app is still open: the swap after quitting is
        // then two renames in one folder, and a folder the app can't write to (or a macOS privacy prompt for it, as
        // in ~/Documents) shows up now instead of after the app is gone.
        let current = Bundle.main.bundleURL
        let staged = current.deletingLastPathComponent().appendingPathComponent(".\(current.lastPathComponent).update")
        try? fm.removeItem(at: staged)
        do { try fm.moveItem(at: app, to: staged) } catch { throw Failure.notWritable }
        try? fm.removeItem(at: work)
        return Staged(build: release.build, version: release.version, url: staged)
    }

    /// Once this process has quit: swap the bundles (back to the old one if that fails), drop the download quarantine
    /// and, with `relaunch`, start the new build. With `relaunch` the app quits now; without, it's the user's quit.
    static func apply(_ staged: Staged, relaunch: Bool) throws {
        let script = """
        while kill -0 \(getpid()) 2>/dev/null; do sleep 0.2; done
        [ -d "$1" ] || exit 0
        rm -rf "$2.old"
        mv "$2" "$2.old" && { mv "$1" "$2" || mv "$2.old" "$2"; }
        rm -rf "$2.old" "$1"
        xattr -dr com.apple.quarantine "$2" 2>/dev/null
        \(relaunch ? "open \"$2\"" : "")
        """
        let swap = Process()
        swap.executableURL = URL(fileURLWithPath: "/bin/sh")
        swap.arguments = ["-c", script, "swap", staged.url.path, Bundle.main.bundleURL.path]
        try swap.run()
        guard relaunch else { return }
        NSApp.terminate(nil)
        // Still here: quitting was cancelled (chats running outside detached sessions). Keep the current build.
        swap.terminate()
        throw Failure.cancelled
    }

    private static func run(_ tool: String, _ args: [String]) throws {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: tool)
        p.arguments = args
        try p.run()
        p.waitUntilExit()
        guard p.terminationStatus == 0 else { throw Failure.badBundle }
    }
}
