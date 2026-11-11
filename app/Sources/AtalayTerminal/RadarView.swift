import AppKit
import WebKit
import UniformTypeIdentifiers

/// The animated radar page (Resources/web) in a WKWebView, fed by the engine through `window.__radar`.
@MainActor
final class RadarView: NSObject, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    var onMessage: (([String: Any]) -> Void)?

    override init() {
        let config = WKWebViewConfiguration()
        // Sounds play without a click on the page first, as the message panels' do: the dashboard's pings when sound is on,
        // a theme's own (web/hooks.js).
        config.mediaTypesRequiringUserActionForPlayback = []
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: Self.terminalLook, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1200, height: 800), configuration: config)
        super.init()
        ThemeStore.shared.attach(webView, zooms: true)
        ucc.add(WeakMessageHandler(self), name: "radar")
        ucc.addScriptMessageHandler(CloudBridge(), contentWorld: .page, name: "cloud")
        ucc.addScriptMessageHandler(ThemeBridge(), contentWorld: .page, name: "theme")
        ucc.addScriptMessageHandler(KeysBridge(), contentWorld: .page, name: "keys")
        ucc.addScriptMessageHandler(SaversBridge(), contentWorld: .page, name: "savers")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        webView.uiDelegate = self
        let dir = Self.webDirectory()
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
    }

    /// The terminals' font for the pages that show code in it (Source Control, the file editor), the user's iTerm2 one,
    /// as `window.__terminalLook`; their colours are the theme's (ThemeStore).
    static let terminalLook: String = {
        let look = ITermLook.current
        let family = look?.fontName.flatMap { NSFont(name: $0, size: 13)?.familyName } ?? "Menlo"
        let value: [String: Any] = ["font": family, "size": Double(look?.fontSize ?? 13)]
        let json = (try? JSONSerialization.data(withJSONObject: value)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return "window.__terminalLook = \(json);"
    }()

    /// Bundled copy inside the .app, or the source folder when run with `swift run`.
    nonisolated static func webDirectory() -> URL {
        if let res = Bundle.main.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: res.appendingPathComponent("index.html").path) {
            return res
        }
        return URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Resources/web")
    }

    /// Settings' archived chats (web/cloud.js) go to the chats list (Sidebar.swift).
    func handleArchive(_ bridge: ArchiveBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "archive")
    }

    /// Settings' deleted chats (web/cloud.js) go to the chats list too (Sidebar.swift's trash).
    func handleTrash(_ bridge: TrashBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "trash")
    }

    /// Source Control's requests (web/git.js) go to Git.swift.
    func handleGit(_ bridge: GitBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "git")
    }

    /// The spend panel's history (web/app.js) comes from the engine's ledger (Ledger.swift).
    func handleSpend(_ bridge: SpendBridge) {
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "spend")
    }

    /// Source Control's files (web/file-editor.js) are read and written by FileEditor.swift.
    func handleFiles(_ bridge: FilesBridge) {
        bridge.web = webView
        webView.configuration.userContentController.addScriptMessageHandler(bridge, contentWorld: .page, name: "files")
    }

    /// A file in Source Control's editor, in a tab of its own (or the one it has), at `line`; `cwd`: the folder its path
    /// is shown from.
    func openFile(_ url: URL, line: Int?, column: Int?, cwd: String) {
        var spec: [String: Any] = ["path": url.standardizedFileURL.path, "cwd": cwd, "home": NSHomeDirectory()]
        if let line { spec["line"] = line }
        if let column { spec["column"] = column }
        callPage("window.GitView && GitView.openFile(spec)", ["spec": spec])
    }

    /// ⌘N: a new file in Source Control's editor, VS Code's Untitled-1.
    func newFile() { callPage("window.GitView && GitView.newFile()") }

    /// What the editor hasn't saved yet goes to disk (the app quits), then `done`.
    func flushFiles(_ done: @escaping @MainActor () -> Void) {
        webView.callAsyncJavaScript("return window.FileEditor ? await FileEditor.flush() : true", arguments: [:], in: nil, in: .page) { _ in done() }
    }

    private func callPage(_ js: String, _ args: [String: Any] = [:]) {
        webView.callAsyncJavaScript(js, arguments: args, in: nil, in: .page) { result in
            if case .failure(let error) = result { NSLog("dashboard page: %@ failed: %@", js, String(describing: error)) }
        }
    }

    func push(_ fn: String, _ json: String) {
        webView.evaluateJavaScript("window.__radar && window.__radar.\(fn)(\(json)); true") { _, error in
            if let error { NSLog("dashboard page: %@ failed: %@", fn, String(describing: error)) }
        }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        if let body = message.body as? [String: Any] { onMessage?(body) }
    }

    /// ⌘R: loads the dashboard page again. Only the page restarts; chats run in their own windows and
    /// detached sessions and don't notice. A page that doesn't answer within 2 s is stuck, so its web
    /// process is ended instead and WebKit starts a fresh one (see below).
    func reload() {
        var answered = false
        webView.evaluateJavaScript("1") { [weak self] _, _ in
            answered = true
            self?.webView.reload()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self, !answered else { return }
            NSLog("dashboard page: not answering, restarting its web process")
            // WebKit has no public way to end a hung page's process; its pid is SPI, checked before use.
            guard self.webView.responds(to: NSSelectorFromString("_webProcessIdentifier")),
                  let pid = (self.webView.value(forKey: "_webProcessIdentifier") as? NSNumber)?.int32Value, pid > 0 else {
                self.webView.reload()
                return
            }
            kill(pid, SIGKILL)
        }
    }

    /// If WebKit's page process dies the dashboard would stay blank; load it again (it asks for a fresh init).
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("dashboard page: web content process ended, reloading")
        webView.reload()
    }

    /// An `<input type=file>` on the page (Settings → PROFILE's new picture, profile.js): WebKit leaves the panel to the
    /// app, Electron opens its own on Windows. Pictures only, one at a time.
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let panel = NSOpenPanel()
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true
        panel.allowedContentTypes = [.png, .jpeg, .webP, .gif]
        guard let window = webView.window else { return completionHandler(panel.runModal() == .OK ? panel.urls : nil) }
        panel.beginSheetModal(for: window) { completionHandler($0 == .OK ? panel.urls : nil) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.request.url?.isFileURL == true {
            decisionHandler(.allow)
        } else {
            if let url = action.request.url { NSWorkspace.shared.open(url) }
            decisionHandler(.cancel)
        }
    }
}

/// WKUserContentController retains its handlers; this breaks the cycle.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(ucc, didReceive: message)
    }
}

/// The spend panel's history tabs (web/app.js): the spend of the last days, weeks or months by project, from the engine's
/// ledger (Ledger.swift).
final class SpendBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let engine: RadarEngine

    init(engine: RadarEngine) { self.engine = engine }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        guard body["type"] as? String == "history" else {
            return MainActor.assumeIsolated { replyHandler(nil, "unknown request") }
        }
        engine.spendHistory(body["range"] as? String ?? "30d") { out in
            MainActor.assumeIsolated { replyHandler(out, nil) }
        }
    }
}
