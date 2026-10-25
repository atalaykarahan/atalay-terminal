import AppKit
import WebKit

/// Saved shortcut folders (the 5 slices of the pie), kept in ~/Library/Application Support/atalay-terminal.
final class ShortcutStore {
    static let count = 5
    struct Slot: Codable {
        let name: String
        let dir: String
    }

    private(set) var slots: [Slot?] = Array(repeating: nil, count: ShortcutStore.count)
    private let url: URL

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support")
        url = base.appendingPathComponent("atalay-terminal/shortcuts.json")
        if let data = try? Data(contentsOf: url), let saved = try? JSONDecoder().decode([Slot?].self, from: data) {
            slots = Array((saved + Array(repeating: nil, count: Self.count)).prefix(Self.count))
        }
    }

    var json: [Any] {
        slots.map { s -> Any in
            guard let s else { return NSNull() }
            return ["name": s.name, "dir": s.dir, "display": tildify(s.dir)]
        }
    }

    func save(_ raw: Any?) throws {
        guard let list = raw as? [Any], list.count == Self.count else { throw err("need \(Self.count) slots") }
        var next: [Slot?] = []
        for item in list {
            guard let d = item as? [String: Any], let dirRaw = d["dir"] as? String else {
                next.append(nil)
                continue
            }
            let dir = FolderLister.expand(dirRaw)
            var isDir: ObjCBool = false
            guard FileManager.default.fileExists(atPath: dir, isDirectory: &isDir), isDir.boolValue else { throw err("not a folder: \(dirRaw)") }
            let name = (d["name"] as? String).flatMap { $0.isEmpty ? nil : String($0.prefix(40)) } ?? (dir as NSString).lastPathComponent
            next.append(Slot(name: name, dir: dir))
        }
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(next).write(to: url, options: .atomic)
        slots = next
    }

    private func err(_ msg: String) -> NSError { NSError(domain: "shortcuts", code: 1, userInfo: [NSLocalizedDescriptionKey: msg]) }
}

/// Folder listing for the in-app picker (folders only, with git / Claude badges).
enum FolderLister {
    static func expand(_ p: String) -> String {
        if p == "~" { return HOME }
        if p.hasPrefix("~/") { return HOME + String(p.dropFirst(1)) }
        return p
    }

    static func list(_ raw: String, projects: String) -> [String: Any] {
        let dir = URL(fileURLWithPath: expand(raw.isEmpty ? "~" : raw)).standardizedFileURL.path
        let parent: Any = dir == "/" ? NSNull() : (dir as NSString).deletingLastPathComponent
        let fm = FileManager.default
        guard let names = try? fm.contentsOfDirectory(atPath: dir) else {
            return ["path": dir, "display": tildify(dir), "parent": parent, "error": fm.isReadableFile(atPath: dir) ? "cannot open" : "no permission", "entries": []]
        }
        var entries: [[String: Any]] = []
        for n in names {
            if entries.count >= 600 { break }
            let full = (dir as NSString).appendingPathComponent(n)
            var isDir: ObjCBool = false
            guard fm.fileExists(atPath: full, isDirectory: &isDir), isDir.boolValue, !n.hasSuffix(".app") else { continue }
            let mtime = ((try? fm.attributesOfItem(atPath: full))?[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
            let encoded = String(full.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) && $0.isASCII ? Character($0) : "-" })
            entries.append([
                "name": n, "path": full, "hidden": n.hasPrefix("."), "modified": mtime * 1000,
                "git": fm.fileExists(atPath: full + "/.git"),
                "claude": fm.fileExists(atPath: projects + "/" + encoded),
            ])
        }
        entries.sort { ($0["name"] as! String).localizedStandardCompare($1["name"] as! String) == .orderedAscending }
        return ["path": dir, "display": tildify(dir), "parent": parent, "entries": entries]
    }

    static func places(recents: [(path: String, t: Double)]) -> [String: Any] {
        let fav = finderFavorites() ?? [("Home", HOME), ("Desktop", HOME + "/Desktop"), ("Documents", HOME + "/Documents"),
                                         ("Downloads", HOME + "/Downloads")]
        let favorites: [[String: Any]] = fav.compactMap { name, path in
            var isDir: ObjCBool = false
            guard FileManager.default.fileExists(atPath: path, isDirectory: &isDir), isDir.boolValue else { return nil }
            var place: [String: Any] = ["name": name, "path": path, "display": tildify(path)]
            place["icon"] = icon(for: path)
            return place
        }
        let rec: [[String: Any]] = recents.map { ["name": ($0.path as NSString).lastPathComponent, "path": $0.path, "display": tildify($0.path), "t": $0.t] }
        return ["home": HOME, "favorites": favorites, "recents": rec]
    }

    /// Favorites from the Finder sidebar, in Finder's order. Read every time the picker opens, so it follows
    /// Finder. The list is a keyed archive (.sfl4 on macOS 26, .sfl3/.sfl2 before) of items with bookmarks;
    /// the path comes from the bookmark's stored values, without resolving it. Nil if it can't be read.
    private static func finderFavorites() -> [(name: String, path: String)]? {
        let base = HOME + "/Library/Application Support/com.apple.sharedfilelist/com.apple.LSSharedFileList.FavoriteItems."
        guard let data = ["sfl4", "sfl3", "sfl2"].lazy.compactMap({ FileManager.default.contents(atPath: base + $0) }).first,
              let root = try? NSKeyedUnarchiver.unarchivedObject(
                  ofClasses: [NSDictionary.self, NSArray.self, NSString.self, NSNumber.self, NSData.self, NSUUID.self], from: data) as? NSDictionary,
              let items = root["items"] as? [NSDictionary] else { return nil }
        let favorites: [(name: String, path: String)] = items.compactMap { item in
            guard (item["visibility"] as? Int ?? 0) == 0, let bookmark = item["Bookmark"] as? Data,
                  let values = URL.resourceValues(forKeys: [.pathKey, .localizedNameKey], fromBookmarkData: bookmark),
                  let path = values.path else { return nil }
            return (values.localizedName ?? (path as NSString).lastPathComponent, path)
        }
        return favorites.isEmpty ? nil : favorites
    }

    private static func icon(for path: String) -> String? {
        switch path {
        case HOME: return "home"
        case HOME + "/Desktop": return "desktop"
        case HOME + "/Documents": return "doc"
        case HOME + "/Downloads": return "down"
        default: return ["Repos", "Projects", "Developer", "Code", "GitHub"].contains((path as NSString).lastPathComponent) ? "code" : nil
        }
    }
}

/// Borderless panel over the whole screen that hosts the shortcut pie and the folder picker
/// (Resources/web/overlay.html) above every app window, including a full-screen dashboard.
final class OverlayPanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

@MainActor
final class OverlayController: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
    weak var manager: MainWindowController?
    let store = ShortcutStore()
    private let panel: OverlayPanel
    private let webView: WKWebView
    private let blur = NSVisualEffectView()
    private var ready = false
    private var pending: (() -> Void)?
    private var hideWork: DispatchWorkItem?

    override init() {
        panel = OverlayPanel(contentRect: NSRect(x: 0, y: 0, width: 800, height: 600), styleMask: [.borderless, .nonactivatingPanel],
                             backing: .buffered, defer: false)
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        config.userContentController.addScriptMessageHandler(self, contentWorld: .page, name: "overlay")
        webView.navigationDelegate = self
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.level = .popUpMenu
        panel.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        panel.appearance = NSAppearance(named: .darkAqua)

        let root = NSView()
        blur.material = .fullScreenUI
        blur.blendingMode = .behindWindow
        blur.state = .active
        blur.alphaValue = 0
        webView.setValue(false, forKey: "drawsBackground")
        for v in [blur, webView] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(v)
            NSLayoutConstraint.activate([
                v.topAnchor.constraint(equalTo: root.topAnchor), v.bottomAnchor.constraint(equalTo: root.bottomAnchor),
                v.leadingAnchor.constraint(equalTo: root.leadingAnchor), v.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            ])
        }
        panel.contentView = root
        let dir = RadarView.webDirectory()
        webView.loadFileURL(dir.appendingPathComponent("overlay.html"), allowingReadAccessTo: dir)
    }

    var isVisible: Bool { panel.isVisible }

    /// Pie menu centred on a screen point (three-finger click).
    func showShortcuts(at point: NSPoint) {
        let screen = NSScreen.screens.first(where: { NSMouseInRect(point, $0.frame, false) }) ?? NSScreen.main ?? NSScreen.screens[0]
        let f = screen.frame
        present(on: screen) { [weak self] in
            self?.webView.evaluateJavaScript("Overlay.shortcuts(\(point.x - f.minX), \(f.maxY - point.y))")
        }
    }

    /// Folder picker for a new terminal.
    func showNewTerminal() {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        present(on: screen) { [weak self] in self?.webView.evaluateJavaScript("Overlay.newTerminal()") }
    }

    private func present(on screen: NSScreen, _ js: @escaping () -> Void) {
        hideWork?.cancel()
        panel.setFrame(screen.frame, display: true)
        if !panel.isVisible {
            blur.alphaValue = 0
            panel.orderFrontRegardless()
            NSAnimationContext.runAnimationGroup { ctx in
                ctx.duration = 0.22
                blur.animator().alphaValue = 0.85
            }
        }
        panel.makeKey()
        if ready { js() } else { pending = js }
    }

    func hide() {
        guard panel.isVisible else { return }
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = 0.2
            blur.animator().alphaValue = 0
        }
        let work = DispatchWorkItem { [weak self] in self?.panel.orderOut(nil) }
        hideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22, execute: work)
    }

    /// The overlay page's process died: reload it; it reports "ready" again.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        webView.reload()
    }

    // MARK: WKScriptMessageHandlerWithReply

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else {
            replyHandler(nil, "bad message")
            return
        }
        switch type {
        case "ready":
            ready = true
            pending?()
            pending = nil
            replyHandler(true, nil)
        case "listDir":
            replyHandler(FolderLister.list(body["path"] as? String ?? "~", projects: manager?.engine.projects ?? ""), nil)
        case "places":
            guard let manager else { return replyHandler(FolderLister.places(recents: []), nil) }
            manager.engine.recentFolders(12) { recents in replyHandler(FolderLister.places(recents: recents), nil) }
        case "getSlots":
            replyHandler(["slots": store.json], nil)
        case "saveSlots":
            do {
                try store.save(body["slots"])
                replyHandler(["slots": store.json], nil)
            } catch {
                replyHandler(["error": error.localizedDescription], nil)
            }
        case "newTerminal":
            let dir = FolderLister.expand(body["dir"] as? String ?? "")
            hide()
            if !dir.isEmpty { manager?.newTerminal(in: dir) }
            replyHandler(true, nil)
        case "done":
            hide()
            replyHandler(true, nil)
        default:
            replyHandler(nil, "unknown message")
        }
    }
}
