import CryptoKit
import Foundation
import WebKit

/// Released builds know the SHA-256 of every file of their pages: build-app.sh writes the list into the program
/// (WebManifest+Build.swift, never committed, made together with the client key). The pages decide what the app asks
/// the API for, and macOS doesn't check an app's resources when it opens it, so changed page files, or this program run
/// from a copy beside other ones, would ask in this app's name. When a file differs, is missing or is new, the app stops
/// signing its API calls for the rest of the run (ClientKey): friends, messages and XP go quiet. Checked at launch and
/// whenever a page loads.
@MainActor
enum WebIntegrity {
    #if CLIENT_KEY
    private static var broken = false
    static var intact: Bool { !broken }

    /// Compares the pages' folder with the list; false, and from then on, when they differ.
    @discardableResult
    static func check() -> Bool {
        guard !broken else { return false }
        if files(in: RadarView.webDirectory()) != manifest {
            broken = true
            NSLog("Orbiterm: the pages aren't this build's own; its API calls stay unsigned until it starts again")
        }
        return !broken
    }

    /// Every file under `dir` (by its path inside it) and its SHA-256; a link or anything but a plain file counts as
    /// changed. Finder's .DS_Store is left out.
    private static func files(in dir: URL) -> [String: String] {
        let root = dir.standardizedFileURL.path + "/"
        let keys: [URLResourceKey] = [.isRegularFileKey, .isDirectoryKey]
        guard let walk = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: keys) else { return [:] }
        var out: [String: String] = [:]
        for case let url as URL in walk {
            let values = try? url.resourceValues(forKeys: Set(keys))
            if values?.isDirectory == true { continue }
            let path = url.standardizedFileURL.path
            guard path.hasPrefix(root) else { return [:] }
            let name = String(path.dropFirst(root.count))
            if (name as NSString).lastPathComponent == ".DS_Store" { continue }
            guard values?.isRegularFile == true, let data = try? Data(contentsOf: url) else { out[name] = "?"; continue }
            out[name] = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        }
        return out
    }
    #else
    static var intact: Bool { true }
    @discardableResult static func check() -> Bool { true }
    #endif
}

extension WKWebViewConfiguration {
    /// No Web Inspector for the app's pages, whatever the user's defaults or launch arguments say: WebKit turns its
    /// developer extras ("Inspect Element") on for a WebKitDebugDeveloperExtrasEnabled default even with isInspectable
    /// off, so they're switched off here, on the configuration, before the view is made.
    func lockInspector() {
        let p = preferences
        if p.responds(to: NSSelectorFromString("_setDeveloperExtrasEnabled:")) || p.responds(to: NSSelectorFromString("setDeveloperExtrasEnabled:")) {
            p.setValue(false, forKey: "developerExtrasEnabled")
        }
    }
}

extension WKWebView {
    /// Not inspectable from Safari's Develop menu either.
    func lockInspector() {
        if #available(macOS 13.3, *) { isInspectable = false }
    }
}

/// Where a page of the app's may go: only to its own files (Resources/web). A web link opens in the browser instead
/// (SafeOpen); anything else stays put. Pages that can reach the API mustn't turn into someone else's.
@MainActor
enum PagePolicy {
    static func decide(_ action: WKNavigationAction) -> WKNavigationActionPolicy {
        guard let url = action.request.url else { return .cancel }
        if url.scheme == "about" { return .allow }
        if url.isFileURL {
            let root = RadarView.webDirectory().standardizedFileURL.path + "/"
            return url.standardizedFileURL.path.hasPrefix(root) ? .allow : .cancel
        }
        if action.navigationType == .linkActivated { SafeOpen.open(url) }
        return .cancel
    }
}
