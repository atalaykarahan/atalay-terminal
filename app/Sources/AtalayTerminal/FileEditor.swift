import AppKit
import WebKit

/// The file side of Source Control's editor (web/file-editor.js): the dashboard opens a text file there, beside the diff,
/// when it's ⌘-clicked in a terminal (rather than in its app, VS Code), and a new one on ⌘N. This reads and writes the
/// files for the page, only the ones opened there (and the pictures a Markdown file shows), and asks where a new one goes.
final class FilesBridge: NSObject, WKScriptMessageHandlerWithReply {
    weak var web: WKWebView? { didSet { watchInput() } }
    /// The files the page may read: those opened in it (a ⌘-click, a link in a Markdown preview, Source Control's Open
    /// File, a Save As).
    private var allowed: Set<String> = []
    /// Those it may also write: the ones the app opened (a ⌘-click, a Save As), and one the page asked for (a link in a
    /// Markdown preview, Source Control's Open File) once the user agreed to save it (confirmWrite). The page alone never
    /// makes a file writable.
    private var writable: Set<String> = []
    /// Where each file the page asked for was opened from, as that question says it ("a link in a Markdown preview").
    private var askedFrom: [String: String] = [:]
    /// When the system last delivered a click (or Return or Space) to the dashboard, and any key or click: the user's,
    /// since a page can't make these. A link opens only right after one, and a save is asked about only after one.
    private var lastPress = -Double.infinity, lastInput = -Double.infinity
    private var monitor: Any?
    /// Asks the page to open a file (GitView.openFile): a link in a Markdown preview to a text file beside it.
    var onOpen: (@MainActor (URL, Int?, String) -> Void)?
    /// The repositories Source Control lists (Git.listedRoots): its Open File opens a file in one of them.
    var repositories: @MainActor () -> [String] = { [] }
    /// Asks the user before the first save of a file the page asked for (its path, where it was opened from): true to
    /// save it.
    var confirmWrite: @MainActor (String, String) -> Bool = FilesBridge.askToSave

    func allow(_ url: URL) {
        let path = url.standardizedFileURL.path
        allowed.insert(path)
        writable.insert(path)
    }

    /// The user picked an item in a menu the app showed for the page (Source Control's ⋯, with its Open File): a click
    /// like any other, though it went to the menu and not to the page.
    @MainActor
    func pressed() {
        lastPress = ProcessInfo.processInfo.systemUptime
        lastInput = lastPress
    }

    deinit { if let monitor { NSEvent.removeMonitor(monitor) } }

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
            // One the page asked for (a Markdown link, Open File): written once the user agrees, right after typing or
            // clicking here.
            if !writable.contains(path) {
                let from = askedFrom[path] ?? "the dashboard"
                guard userActed(within: 10), confirmWrite(path, from) else { return ["error": "the save wasn't confirmed (it was opened from \(from))"] }
                writable.insert(path)
            }
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
            if mine, userActed(within: 1, press: true) { NSWorkspace.shared.open(URL(fileURLWithPath: path)) }
        case "reveal":
            if mine { NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)]) }
        case "openURL":
            if let url = URL(string: body["url"] as? String ?? ""), ["http", "https", "mailto"].contains(url.scheme?.lowercased()) {
                NSWorkspace.shared.open(url)
            }
        case "openPath":
            // A link in a Markdown preview or Source Control's Open File, clicked: a text file in the editor, anything else
            // in its app, unless it starts something (SafeOpen: an app or a script is shown in the Finder). Only right after
            // a click the system delivered here. A text file from a link: only from a Markdown file the page may already
            // read (`from`), and only inside its repository (or its folder). From Open File (no `from`): only inside a
            // repository Source Control lists. Either way read only until a save is agreed to.
            guard userActed(within: 1, press: true) else { return ["error": "not clicked"] }
            let url = URL(fileURLWithPath: path)
            if Self.canOpen(url) {
                let origin: String
                if let from = (body["from"] as? String).map({ URL(fileURLWithPath: $0).standardizedFileURL.path }) {
                    guard allowed.contains(from), Self.isMarkdown(from), Self.linkable(path, from: from) else { return ["error": "not beside the Markdown file"] }
                    origin = "a link in a Markdown preview"
                } else {
                    guard Self.inside(path, oneOf: repositories()) else { return ["error": "not in a repository Source Control lists"] }
                    origin = "Source Control"
                }
                if !writable.contains(path) { askedFrom[path] = origin }
                allowed.insert(path)
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

    // MARK: the user's input

    /// Watches the clicks and keys the system delivers to the dashboard (a local monitor: this app's events only).
    private func watchInput() {
        guard monitor == nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseUp, .keyDown]) { [weak self] event in
            MainActor.assumeIsolated { self?.saw(event) }
            return event
        }
    }

    @MainActor
    private func saw(_ event: NSEvent) {
        guard let web, let window = web.window, event.window === window else { return }
        let now = ProcessInfo.processInfo.systemUptime
        if event.type == .leftMouseUp {
            guard web.bounds.contains(web.convert(event.locationInWindow, from: nil)) else { return }
            lastPress = now
            lastInput = now
        } else if let responder = window.firstResponder as? NSView, responder.isDescendant(of: web) {
            lastInput = now
            // Return, Enter and Space activate a link.
            if [36, 76, 49].contains(event.keyCode) { lastPress = now }
        }
    }

    /// Whether the user clicked here (`press`), or did anything here, in the last `seconds`.
    private func userActed(within seconds: Double, press: Bool = false) -> Bool {
        ProcessInfo.processInfo.systemUptime - (press ? lastPress : lastInput) < seconds
    }

    /// The question before the first save of a file the page asked for: its name, where it was opened from (`from`: "a
    /// link in a Markdown preview", "Source Control") and its folder, Save or Cancel.
    @MainActor
    static func askToSave(_ path: String, _ from: String) -> Bool {
        let folder = ((path as NSString).deletingLastPathComponent as NSString).abbreviatingWithTildeInPath
        let alert = NSAlert()
        alert.messageText = "Save changes to \((path as NSString).lastPathComponent)?"
        alert.informativeText = "It was opened from \(from), in \(folder)."
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")
        return alert.runModal() == .alertFirstButtonReturn
    }

    // MARK: the files

    /// A file the editor shows as Markdown, with its preview (web/tm/languages.js's text.html.markdown).
    nonisolated static func isMarkdown(_ path: String) -> Bool {
        ["md", "mkd", "mkdn", "mdwn", "mdown", "markdown", "markdn", "mdtxt", "mdtext", "copilotmd", "litcoffee", "ron", "ronn",
         "workbook"].contains((path as NSString).pathExtension.lowercased())
    }

    /// Whether a link in the Markdown file `from` may open `path` in the editor, both as the files they really are (links
    /// followed): inside the repository holding `from` (the folder with .git above it, not the home folder); outside any,
    /// below `from`'s folder and in no hidden folder (.ssh) nor a hidden file (.env), only that folder itself when it's the
    /// home folder or the disk's root.
    nonisolated static func linkable(_ path: String, from: String, home: String = NSHomeDirectory()) -> Bool {
        let real = { (p: String) in URL(fileURLWithPath: p).resolvingSymlinksInPath().path }
        let target = real(path), folder = real((from as NSString).deletingLastPathComponent), home = real(home)
        var dir = folder
        while dir != "/", !dir.isEmpty {
            if dir != home, FileManager.default.fileExists(atPath: dir + "/.git") { return target.hasPrefix(dir + "/") }
            dir = (dir as NSString).deletingLastPathComponent
        }
        let base = folder == "/" ? "/" : folder + "/"
        guard target.hasPrefix(base) else { return false }
        let rest = target.dropFirst(base.count).split(separator: "/")
        if rest.contains(where: { $0.hasPrefix(".") }) { return false }
        return (folder != home && folder != "/") || rest.count == 1
    }

    /// Whether `path` is inside one of `roots` (the repositories Source Control lists), as the file it really is (links
    /// followed): a link in a repository to a file outside it isn't.
    nonisolated static func inside(_ path: String, oneOf roots: [String]) -> Bool {
        let real = { (p: String) in URL(fileURLWithPath: p).resolvingSymlinksInPath().path }
        let target = real(path)
        return roots.contains { !$0.isEmpty && target.hasPrefix(real($0) + "/") }
    }

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
