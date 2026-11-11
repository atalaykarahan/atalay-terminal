import AppKit
import WebKit

/// The file side of Source Control's editor (web/file-editor.js): the dashboard opens a text file there, beside the diff,
/// when it's ⌘-clicked in a terminal (rather than in its app, VS Code), and a new one on ⌘N. This reads and writes the
/// files for the page, only the ones opened there (and the pictures a Markdown file shows), and asks where a new one goes.
final class FilesBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var web: WKWebView?
    /// The files the page may read and write: those opened in it (a ⌘-click, a link in a Markdown preview, a Save As).
    private var allowed: Set<String> = []
    /// Asks the page to open a file (GitView.openFile): a link in a Markdown preview to a text file beside it.
    var onOpen: (@MainActor (URL, Int?, String) -> Void)?

    func allow(_ url: URL) { allowed.insert(url.standardizedFileURL.path) }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        MainActor.assumeIsolated {
            let body = message.body as? [String: Any] ?? [:]
            if body["type"] as? String == "saveAs" { return saveAs(body) { replyHandler($0, nil) } }
            replyHandler(handle(body), nil)
        }
    }

    @MainActor
    private func handle(_ body: [String: Any]) -> Any? {
        let path = (body["path"] as? String).map { URL(fileURLWithPath: $0).standardizedFileURL.path } ?? ""
        let mine = allowed.contains(path)
        switch body["type"] as? String {
        case "read":
            guard mine, let file = Self.text(of: path) else { return ["error": "\((path as NSString).lastPathComponent) can't be shown as text."] }
            return ["text": file.text, "bom": file.bom, "mtime": Self.mtime(path) ?? 0, "app": Self.appName(for: path) ?? ""]
        case "write":
            guard mine, let text = body["text"] as? String else { return ["error": "not a file opened here"] }
            // Changed on disk since the page read it: the user picks (the page's banner).
            if let base = body["base"] as? Double, let now = Self.mtime(path), abs(now - base) > 0.0005 { return ["conflict": true] }
            do {
                try Self.write(text, bom: body["bom"] as? Bool ?? false, to: path)
                return ["mtime": Self.mtime(path) ?? 0]
            } catch {
                return ["error": error.localizedDescription]
            }
        case "stat":
            var out: [String: Any] = [:]
            for p in body["paths"] as? [String] ?? [] where allowed.contains(p) { out[p] = Self.mtime(p) ?? NSNull() }
            return out
        case "image":
            return Self.image(at: path).map { ["url": $0] } ?? ["error": "no picture"]
        case "external":
            if mine { NSWorkspace.shared.open(URL(fileURLWithPath: path)) }
        case "reveal":
            if mine { NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)]) }
        case "openURL":
            if let url = URL(string: body["url"] as? String ?? ""), ["http", "https", "mailto"].contains(url.scheme?.lowercased()) {
                NSWorkspace.shared.open(url)
            }
        case "openPath":
            // A link in a Markdown preview: a text file in the editor, anything else in its app, unless it starts
            // something (SafeOpen: an app or a script is shown in the Finder).
            let url = URL(fileURLWithPath: path)
            if Self.canOpen(url) {
                allow(url)
                onOpen?(url, body["line"] as? Int, body["cwd"] as? String ?? url.deletingLastPathComponent().path)
            } else if FileManager.default.fileExists(atPath: path) {
                SafeOpen.file(url)
            }
        default:
            break
        }
        return nil
    }

    /// A new file's first save (VS Code's Save As): where it goes, then its text written there.
    @MainActor
    private func saveAs(_ body: [String: Any], reply: @escaping @MainActor (Any?) -> Void) {
        let panel = NSSavePanel()
        panel.nameFieldStringValue = body["name"] as? String ?? "Untitled.txt"
        panel.canCreateDirectories = true
        let done = { (response: NSApplication.ModalResponse) in
            guard response == .OK, let url = panel.url, let text = body["text"] as? String else { return reply(["cancelled": true]) }
            do {
                try Self.write(text, bom: false, to: url.path)
                self.allow(url)
                reply(["path": url.standardizedFileURL.path, "mtime": Self.mtime(url.path) ?? 0, "app": Self.appName(for: url.path) ?? ""])
            } catch {
                reply(["error": error.localizedDescription])
            }
        }
        if let window = web?.window {
            panel.beginSheetModal(for: window) { r in MainActor.assumeIsolated { done(r) } }
        } else {
            done(panel.runModal())
        }
    }

    // MARK: the files

    /// The largest file the editor opens; a bigger one opens in its app.
    nonisolated static let largest = 10 << 20

    /// A file's text when it's one the editor shows: UTF-8 (its BOM kept aside), no NUL byte in its first 8 KB (not a
    /// binary file), at most 10 MB.
    nonisolated static func text(of path: String) -> (text: String, bom: Bool)? {
        let url = URL(fileURLWithPath: path).resolvingSymlinksInPath()
        guard let values = try? url.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]), values.isRegularFile == true,
              (values.fileSize ?? 0) <= largest, let data = FileManager.default.contents(atPath: url.path),
              !data.prefix(8192).contains(0) else { return nil }
        let bom = data.starts(with: [0xEF, 0xBB, 0xBF])
        guard let text = String(data: bom ? data.dropFirst(3) : data, encoding: .utf8) else { return nil }
        return (text, bom)
    }

    nonisolated static func canOpen(_ url: URL) -> Bool { url.isFileURL && text(of: url.path) != nil }

    /// When the file last changed (to the nanosecond), through a link; nil when it's gone.
    nonisolated static func mtime(_ path: String) -> Double? {
        var st = stat()
        guard stat(path, &st) == 0 else { return nil }
        return Double(st.st_mtimespec.tv_sec) + Double(st.st_mtimespec.tv_nsec) / 1e9
    }

    /// Writes over the file where it is, as VS Code does (its permissions, its owner and the links to it stay), or makes
    /// it when it isn't there. The old text past the new end goes only once the new is written.
    nonisolated static func write(_ text: String, bom: Bool, to path: String) throws {
        var data = Data(bom ? [0xEF, 0xBB, 0xBF] : [])
        data.append(Data(text.utf8))
        guard FileManager.default.fileExists(atPath: path) else { return try data.write(to: URL(fileURLWithPath: path)) }
        let handle = try FileHandle(forWritingTo: URL(fileURLWithPath: path))
        defer { try? handle.close() }
        try handle.write(contentsOf: data)
        try handle.truncate(atOffset: UInt64(data.count))
    }

    /// A picture a Markdown file shows, as a data: address (the page reads no file outside the app's own).
    nonisolated static func image(at path: String) -> String? {
        let types = ["png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp",
                     "svg": "image/svg+xml", "bmp": "image/bmp", "ico": "image/x-icon"]
        guard let type = types[(path as NSString).pathExtension.lowercased()],
              let size = (try? FileManager.default.attributesOfItem(atPath: path)[.size]) as? Int, size <= largest,
              let data = FileManager.default.contents(atPath: path) else { return nil }
        return "data:\(type);base64,\(data.base64EncodedString())"
    }

    /// The app the file opens in otherwise (VS Code, for most), for the page's "Open in …".
    @MainActor
    static func appName(for path: String) -> String? {
        guard let app = NSWorkspace.shared.urlForApplication(toOpen: URL(fileURLWithPath: path)) else { return nil }
        let name = FileManager.default.displayName(atPath: app.path)
        return name.hasSuffix(".app") ? String(name.dropLast(4)) : name
    }
}
