import AppKit
import WebKit

/// The animated radar page (Resources/web) in a WKWebView, fed by the engine through `window.__radar`.
@MainActor
final class RadarView: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    let webView: WKWebView
    var onMessage: (([String: Any]) -> Void)?

    override init() {
        let config = WKWebViewConfiguration()
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: "window.__RADAR_APP__ = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 1200, height: 800), configuration: config)
        super.init()
        ucc.add(WeakMessageHandler(self), name: "radar")
        ucc.addScriptMessageHandler(CloudBridge(), contentWorld: .page, name: "cloud")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        let dir = Self.webDirectory()
        webView.loadFileURL(dir.appendingPathComponent("index.html"), allowingReadAccessTo: dir)
    }

    /// Bundled copy inside the .app, or the source folder when run with `swift run`.
    static func webDirectory() -> URL {
        if let res = Bundle.main.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: res.appendingPathComponent("index.html").path) {
            return res
        }
        return URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Resources/web")
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
