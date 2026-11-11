import AppKit
import CryptoKit
import Security

/// Installs a newer build offered by the API in two steps. `prepare` downloads its zip, checks the SHA-256 and the
/// Ed25519 signature made with the release key (its public half is AtalayUpdateKey in Info.plist) and unpacks it next to
/// the running app: safe in the background, nothing changes yet. `apply` swaps the bundles once the app has quit, and
/// starts the new build at once or waits for the user to quit. Chats keep running in their detached sessions meanwhile
/// and come back with the new build.
@MainActor
enum Updater {
    /// A newer build, checked and unpacked next to the running app (hidden), waiting to replace it.
    struct Staged { let build: Int; let version: String; let url: URL }

    /// Where `prepare` puts it: beside the app, hidden.
    static var stagedURL: URL {
        let current = Bundle.main.bundleURL
        return current.deletingLastPathComponent().appendingPathComponent(".\(current.lastPathComponent).update")
    }

    /// A build an earlier run staged and never restarted into (that restart hung, as in 0.19.0 and 0.19.1, or the app was
    /// force-quit or crashed): only that run knew of it, so every launch since downloaded it again and tried again.
    /// Newer than this build, the same app and signed as this app is: the one to go in. Its zip was checked against the
    /// release key when it came, but it has waited on disk since, where anything can be put; the signature is what still
    /// ties it to a release. Anything else waiting there is stale, and goes (the next check for updates downloads it again).
    static func leftover() -> Staged? {
        let url = stagedURL
        guard FileManager.default.fileExists(atPath: url.path) else { return nil }
        let build = { (b: Bundle?) in Int(b?.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "") ?? 0 }
        if let staged = Bundle(url: url), staged.bundleIdentifier == Bundle.main.bundleIdentifier, build(staged) > build(.main),
           signedAs(Bundle.main.bundleURL, url) {
            return Staged(build: build(staged), version: staged.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "", url: url)
        }
        try? FileManager.default.removeItem(at: url)
        return nil
    }

    /// Whether the app at `url` is signed as the one at `reference` is: a valid signature (every architecture, the code
    /// inside it, strictly) that meets `reference`'s designated requirement, the release certificate for a release. Every
    /// release so far carries the same one; a build signed ad hoc (a development one) takes no other build.
    nonisolated static func signedAs(_ reference: URL, _ url: URL) -> Bool {
        var ref: SecStaticCode?, requirement: SecRequirement?, code: SecStaticCode?
        guard SecStaticCodeCreateWithPath(reference as CFURL, [], &ref) == errSecSuccess, let ref,
              SecCodeCopyDesignatedRequirement(ref, [], &requirement) == errSecSuccess, let requirement,
              SecStaticCodeCreateWithPath(url as CFURL, [], &code) == errSecSuccess, let code else { return false }
        let flags = SecCSFlags(rawValue: kSecCSCheckAllArchitectures | kSecCSCheckNestedCode | kSecCSStrictValidate)
        return SecStaticCodeCheckValidity(code, flags, requirement) == errSecSuccess
    }

    enum Failure: Error {
        case noKey, download(Int), badSignature, badBundle, cancelled
        /// The folder holding the app can't be written to (or macOS privacy settings refused it).
        case notWritable

        /// Short code the dashboard page turns into a message.
        var code: String { if case .notWritable = self { return "not_writable" }; return "failed" }
    }

    /// `fraction`: how much of the zip has come (0...1) as it comes, for the progress bar.
    static func prepare(_ release: Release, progress: @escaping @MainActor (String) -> Void,
                        fraction: @escaping @MainActor (Double) -> Void = { _ in }) async throws -> Staged {
        guard let raw = (Bundle.main.object(forInfoDictionaryKey: "AtalayUpdateKey") as? String).flatMap({ Data(base64Encoded: $0) }),
              let key = try? Curve25519.Signing.PublicKey(rawRepresentation: raw) else { throw Failure.noKey }
        guard let url = URL(string: release.url) else { throw Failure.download(0) }
        let file = try await Download(onProgress: { f in Task { @MainActor in fraction(f) } }).run(url)
        defer { try? FileManager.default.removeItem(at: file) }
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
        let staged = stagedURL
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

/// The update's zip, telling how much of it has come as it comes (URLSession's own download says nothing until the end,
/// and a long one looked frozen). Done once: one task in its own session.
private final class Download: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
    private let onProgress: @Sendable (Double) -> Void
    private var continuation: CheckedContinuation<URL, Error>?
    private let lock = NSLock()

    init(onProgress: @escaping @Sendable (Double) -> Void) { self.onProgress = onProgress }

    func run(_ url: URL) async throws -> URL {
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        defer { session.finishTasksAndInvalidate() }
        return try await withCheckedThrowingContinuation { c in
            lock.withLock { continuation = c }
            session.downloadTask(with: url).resume()
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData _: Int64,
                    totalBytesWritten written: Int64, totalBytesExpectedToWrite total: Int64) {
        if total > 0 { onProgress(min(1, Double(written) / Double(total))) }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        let status = (downloadTask.response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { return finish(.failure(Updater.Failure.download(status))) }
        // The file is gone once this returns: keep it.
        let kept = FileManager.default.temporaryDirectory.appendingPathComponent("atalay-terminal-update-\(UUID().uuidString).zip")
        do {
            try FileManager.default.moveItem(at: location, to: kept)
            finish(.success(kept))
        } catch {
            finish(.failure(error))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error { finish(.failure(error)) }
    }

    private func finish(_ result: Result<URL, Error>) {
        let c = lock.withLock { () -> CheckedContinuation<URL, Error>? in
            defer { continuation = nil }
            return continuation
        }
        c?.resume(with: result)
    }
}
