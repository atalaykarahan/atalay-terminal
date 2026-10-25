import AppKit
import WebKit

/// Messages, like instant-message windows on a HUD, in two borderless panels that both show
/// Resources/web/messages.html (Swift tells the page which part it is):
/// - notices: a new message, friend request or new friend pops up at the bottom-right corner of the screen, above
///   every window, and goes away on its own; clicking one opens the chat;
/// - chat: the conversation, in a window the user drags by its header like any other (mid-screen the first time,
///   then where it was left).
/// The notices also say when a new version of the app is out; a click on that one shows the dashboard's "what's new".
/// The page decides the size and asks for it, and asks to be moved while the header is dragged.
@MainActor
final class MessagePanel: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
    enum Role: String { case notices, chat }

    static let notices = MessagePanel(.notices)
    static let chat = MessagePanel(.chat)
    /// The update notice was clicked (the main window shows what's new).
    static var onOpenUpdate: (() -> Void)?

    private final class Panel: NSPanel {
        override var canBecomeKey: Bool { true }
        override var canBecomeMain: Bool { false }
    }

    private let role: Role
    private let panel: Panel
    private let webView: WKWebView
    private var ready = false
    /// Scripts that arrived before the page finished loading.
    private var waiting: [String] = []
    private static let originKey = "chatWindowTopLeft"

    private init(_ role: Role) {
        self.role = role
        panel = Panel(contentRect: NSRect(x: 0, y: 0, width: 380, height: 140),
                      styleMask: role == .notices ? [.borderless, .nonactivatingPanel] : [.borderless],
                      backing: .buffered, defer: true)
        let config = WKWebViewConfiguration()
        // Message sounds play without a click on the page first.
        config.mediaTypesRequiringUserActionForPlayback = []
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: "window.__MESSAGES_ROLE__ = '\(role.rawValue)';", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 380, height: 140), configuration: config)
        super.init()
        ucc.add(WeakMessageHandler(self), name: "messages")
        ucc.addScriptMessageHandler(CloudBridge(), contentWorld: .page, name: "cloud")
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.isReleasedWhenClosed = false
        if role == .notices {
            // Above everything, on every space; clicking it doesn't take the keyboard from a terminal unless it's
            // the reply field.
            panel.level = .floating
            panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
            panel.becomesKeyOnlyIfNeeded = true
        } else {
            // A window among the others, like a chat terminal.
            panel.level = .normal
            panel.collectionBehavior = [.fullScreenAuxiliary]
        }
        panel.contentView = webView
        let dir = RadarView.webDirectory()
        webView.loadFileURL(dir.appendingPathComponent("messages.html"), allowingReadAccessTo: dir)
    }

    /// A live event from the API (JSON text).
    func push(_ json: String) {
        run("window.__messages && __messages.event(\(json))")
    }

    /// A newer version of the app is out.
    func announce(update: Release) {
        guard let data = try? JSONSerialization.data(withJSONObject: ["version": update.version, "build": update.build]),
              let json = String(data: data, encoding: .utf8) else { return }
        run("window.__messages && __messages.update && __messages.update(\(json))")
    }

    /// Opens the conversation with a friend (chat panel).
    func open(friend id: String) {
        run("window.__messages && __messages.open(\(Self.literal(id)))")
    }

    private static func literal(_ value: String?) -> String {
        guard let value, let data = try? JSONSerialization.data(withJSONObject: [value]),
              let array = String(data: data, encoding: .utf8) else { return "null" }
        return String(array.dropFirst().dropLast())
    }

    private func run(_ js: String) {
        guard ready else {
            waiting.append(js)
            return
        }
        webView.evaluateJavaScript(js + "; true") { _, error in
            if let error { NSLog("messages page: %@", String(describing: error)) }
        }
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        let number = { (key: String) in (body[key] as? NSNumber)?.doubleValue ?? 0 }
        switch type {
        case "ready":
            ready = true
            let scripts = waiting
            waiting = []
            scripts.forEach(run)
        case "layout":
            let size = CGSize(width: number("w"), height: number("h"))
            guard size.width >= 1, size.height >= 1 else { return panel.orderOut(nil) }
            role == .notices ? placeNotice(size) : placeChat(size, focus: body["focus"] as? Bool == true)
        case "drag":
            guard role == .chat else { return }
            var origin = panel.frame.origin
            origin.x += number("dx")
            origin.y -= number("dy")
            panel.setFrameOrigin(origin)
        case "dragEnd":
            guard role == .chat else { return }
            UserDefaults.standard.set([panel.frame.minX, panel.frame.maxY], forKey: Self.originKey)
        case "openUpdate":
            Self.onOpenUpdate?()
        case "showing":
            // The chat shows this friend: no pop-ups for them meanwhile.
            MessagePanel.notices.run("window.__messages && __messages.showing(\(Self.literal(body["id"] as? String)))")
        case "log":
            NSLog("messages page: %@", String(describing: body["msg"] ?? ""))
        default:
            break
        }
    }

    /// Bottom-right corner of the screen the user is on, clear of the Dock and the menu bar.
    private func placeNotice(_ size: CGSize) {
        let v = (NSScreen.main ?? NSScreen.screens[0]).visibleFrame
        panel.setFrame(NSRect(x: v.maxX - size.width - 12, y: v.minY + 12, width: size.width, height: size.height), display: true)
        if !panel.isVisible { panel.orderFrontRegardless() }
    }

    /// Where it was left (if that's still on a screen), else mid-screen; resizing keeps the top-left corner.
    private func placeChat(_ size: CGSize, focus: Bool) {
        var topLeft: NSPoint
        if panel.isVisible {
            topLeft = NSPoint(x: panel.frame.minX, y: panel.frame.maxY)
        } else if let saved = UserDefaults.standard.array(forKey: Self.originKey) as? [Double], saved.count == 2,
                  NSScreen.screens.contains(where: { $0.visibleFrame.insetBy(dx: -40, dy: -40).contains(NSPoint(x: saved[0] + 40, y: saved[1] - 20)) }) {
            topLeft = NSPoint(x: saved[0], y: saved[1])
        } else {
            let v = (NSScreen.main ?? NSScreen.screens[0]).visibleFrame
            topLeft = NSPoint(x: v.midX - size.width / 2, y: v.midY + size.height / 2)
        }
        panel.setFrame(NSRect(x: topLeft.x, y: topLeft.y - size.height, width: size.width, height: size.height), display: true)
        if focus {
            NSApp.activate(ignoringOtherApps: true)
            panel.makeKeyAndOrderFront(nil)
        } else if !panel.isVisible {
            panel.orderFront(nil)
        }
    }

    /// The page's process died: load it again (it reports "ready" and asks for the conversations anew).
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        webView.reload()
    }
}
