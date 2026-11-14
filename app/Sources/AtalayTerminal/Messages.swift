import AppKit
import WebKit

/// Messages, like instant-message windows on a HUD, in borderless panels that all show Resources/web/messages.html
/// (Swift tells the page which part it is):
/// - notices: a new message, friend request or new friend pops up at the bottom-right corner of the screen, above
///   every window, and goes away on its own; clicking one opens the chat;
/// - chats: one panel per friend whose conversation is open, so several sit on screen side by side, each a window the
///   user drags by its header like any other (the first where the last was left, the next ones cascading from it).
/// ⌘V, ⌘C, ⌘X and ⌘A work in all of them through `editKey`. Chats sit among the terminals pinned above the dashboard,
/// so whichever window was clicked last is on top, and like them they step aside while a dashboard menu is open.
/// The notices also say when a new version of the app is out; a click on that one shows the dashboard's "what's new".
/// And when a chat needs the user (an approval) while the app is behind other windows (WaitNotifier): that notice
/// stays until the chat moves on, and a click on it opens the chat.
/// A level-up takes the notices panel over the whole screen, keys locked for its first moments and then any key ending
/// it, only while the app is in front (the page waits for that).
/// The page decides the size and asks for it, and asks to be moved while the header is dragged.
@MainActor
final class MessagePanel: NSObject, WKScriptMessageHandler, WKNavigationDelegate, NSWindowDelegate {
    enum Role: String { case notices, chat }

    static let notices = MessagePanel(.notices)
    /// Open conversations, by friend id.
    private static var chats: [String: MessagePanel] = [:]
    /// The dashboard window the chats are pinned above, like the terminals.
    static weak var dashboard: NSWindow?
    /// Out of the way of a dashboard menu.
    private var steppedAside = false
    /// Friends whose chat is on screen: the notices don't pop up for them.
    private static var showing = Set<String>()
    /// The update notice was clicked (the main window shows what's new).
    static var onOpenUpdate: (() -> Void)?
    /// The daily bonus notice was clicked (the main window shows your profile).
    static var onOpenProfile: (() -> Void)?
    /// A notification from the developer was clicked.
    static var onOpenNotifications: (() -> Void)?
    /// The danger alarm (a runaway process): Details, and END IT (its pid and start, as the page had them).
    static var onOpenDanger: (() -> Void)?
    static var onEndRunaway: ((Int32, Double) -> Void)?
    /// A chat's "needs you" notice was clicked: that chat, in front (its session id).
    static var onOpenWait: ((String) -> Void)?
    /// The "same file" notice was clicked: the dashboard in front.
    static var onOpenClash: (() -> Void)?
    /// Until when keys do nothing (the level-up takeover; AppDelegate drops them).
    private static var keysLockedUntil: TimeInterval = 0
    static var keysLocked: Bool { ProcessInfo.processInfo.systemUptime < keysLockedUntil }
    /// The takeover is on screen: once the lock is over, a key ends it instead of reaching a window.
    private(set) static var takeoverOn = false
    /// For the app's key monitors (whichever sees a key first): true when it goes nowhere because the takeover is on;
    /// after the takeover's lock a key also ends it.
    static func holds(_ event: NSEvent) -> Bool {
        guard keysLocked || takeoverOn else { return false }
        if !keysLocked, event.type == .keyDown { notices.skipTakeover() }
        return true
    }
    /// Brings the panel back if the takeover's page never says it ended (a crashed page must not keep the screen).
    private var takeoverGuard: DispatchWorkItem?

    private final class Panel: NSPanel {
        override var canBecomeKey: Bool { true }
        override var canBecomeMain: Bool { false }
    }

    private let role: Role
    /// The friend a chat panel is for.
    private let friend: String?
    private let panel: Panel
    private let webView: WKWebView
    /// The frost under the box, the terminals' own (CSS can't blur what's behind a window; the box tints it to the app's
    /// one opacity, --glass-a in style.css). It sits 8 pt in from the panel's edges, the room the box's glow takes, and
    /// fades in and out with the box.
    private let glass = NSVisualEffectView()
    private var ready = false
    /// Scripts that arrived before the page finished loading.
    private var waiting: [String] = []
    private static let originKey = "chatWindowTopLeft"

    private init(_ role: Role, friend: String? = nil) {
        self.role = role
        self.friend = friend
        panel = Panel(contentRect: NSRect(x: 0, y: 0, width: 380, height: 140),
                      styleMask: role == .notices ? [.borderless, .nonactivatingPanel] : [.borderless],
                      backing: .buffered, defer: true)
        let config = WKWebViewConfiguration()
        // Message sounds play without a click on the page first.
        config.mediaTypesRequiringUserActionForPlayback = []
        config.lockInspector()
        let ucc = WKUserContentController()
        ucc.addUserScript(WKUserScript(source: "window.__MESSAGES_ROLE__ = '\(role.rawValue)'; window.__MESSAGES_FRIEND__ = \(Self.literal(friend));",
                                       injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.userContentController = ucc
        webView = WKWebView(frame: NSRect(x: 0, y: 0, width: 380, height: 140), configuration: config)
        webView.lockInspector()
        super.init()
        ThemeStore.shared.attach(webView)
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
            panel.delegate = self
            Self.watchScreens()
        }
        let root = NSView(frame: webView.frame)
        glass.material = .hudWindow
        glass.blendingMode = .behindWindow
        glass.state = .active
        glass.maskImage = Self.roundedMask(radius: 10)
        glass.frame = root.bounds.insetBy(dx: 8, dy: 8)
        glass.autoresizingMask = [.width, .height]
        glass.alphaValue = 0
        webView.autoresizingMask = [.width, .height]
        root.addSubview(glass)
        root.addSubview(webView)
        panel.contentView = root
        let dir = RadarView.webDirectory()
        WebIntegrity.check()
        webView.loadFileURL(dir.appendingPathComponent("messages.html"), allowingReadAccessTo: dir)
        if role == .notices {
            // The level-up waits for the app to be in front.
            for name in [NSApplication.didBecomeActiveNotification, NSApplication.didResignActiveNotification] {
                NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                    MainActor.assumeIsolated { self?.tellFocus() }
                }
            }
        }
    }

    /// A rounded rectangle that stretches: the frost's corners, the box's 10 px radius.
    private static func roundedMask(radius r: CGFloat) -> NSImage {
        let image = NSImage(size: NSSize(width: r * 2 + 1, height: r * 2 + 1), flipped: false) { rect in
            NSColor.black.setFill()
            NSBezierPath(roundedRect: rect, xRadius: r, yRadius: r).fill()
            return true
        }
        image.capInsets = NSEdgeInsets(top: r, left: r, bottom: r, right: r)
        image.resizingMode = .stretch
        return image
    }

    /// The frost in under a box that shows, out with one that leaves; none under the level-up takeover.
    private func frost(_ on: Bool, duration: TimeInterval = 0.3) {
        NSAnimationContext.runAnimationGroup { ctx in
            ctx.duration = duration
            glass.animator().alphaValue = on ? 0.97 : 0
        }
    }

    private func tellFocus() {
        run("window.__messages && __messages.focus && __messages.focus(\(NSApp.isActive))")
    }

    /// A key after the takeover's lock: it ends now.
    func skipTakeover() {
        run("window.__messages && __messages.skip && __messages.skip()")
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

    /// The app updated itself since it last ran: a note in the corner, so a restart while the user was away isn't a mystery.
    func announce(updated version: String) {
        run("window.__messages && __messages.updated && __messages.updated(\(Self.literal(version)))")
    }

    /// Processes left burning a core where nobody sees them (Runaways): the alarm in the middle of the screen.
    func runaways(_ json: String) {
        run("window.__messages && __messages.runaways && __messages.runaways(\(json))")
    }

    /// A chat waiting for the user while the app is behind (WaitNotifier): sid, title, folder and what it waits for.
    /// It stays in the corner until `waitOver`.
    func wait(_ notice: [String: String]) {
        guard let data = try? JSONSerialization.data(withJSONObject: notice), let json = String(data: data, encoding: .utf8) else { return }
        run("window.__messages && __messages.wait && __messages.wait(\(json))")
    }

    /// That chat moved on (answered, or the app came to the front): its notice goes.
    func waitOver(_ sid: String) {
        run("window.__messages && __messages.waitOver && __messages.waitOver(\(Self.literal(sid)))")
    }

    /// Two chats writing the same file (files.heat's collision, from the dashboard page): the file, its path and the
    /// chats. It stays in the corner, as a chat that needs you, until `clashOver`.
    func clash(_ notice: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: notice), let json = String(data: data, encoding: .utf8) else { return }
        run("window.__messages && __messages.clash && __messages.clash(\(json))")
    }

    func clashOver(_ key: String) {
        run("window.__messages && __messages.clashOver && __messages.clashOver(\(Self.literal(key)))")
    }

    /// Your XP as the last heartbeat or live event had it: a new level plays the fanfare (once, the page keeps count).
    func xp(_ x: Cloud.XP) {
        guard let data = try? JSONEncoder().encode(x), let json = String(data: data, encoding: .utf8) else { return }
        run("window.__messages && __messages.xp && __messages.xp(\(json))")
    }

    /// ⌘W in a friend's chat: it closes the way its × does. False when no chat is in front.
    static func closeKeyChat() -> Bool {
        guard let chat = chats.values.first(where: { $0.panel.isKeyWindow }) else { return false }
        chat.run("window.__messages && __messages.close && __messages.close()")
        return true
    }

    /// Opens the conversation with a friend: their panel to the front, or a new one next to the others.
    static func openChat(friend id: String) {
        guard !id.isEmpty else { return }
        let p = chats[id] ?? MessagePanel(.chat, friend: id)
        chats[id] = p
        p.run("window.__messages && __messages.open(\(literal(id)))")
    }

    /// A live event for every open conversation.
    static func pushToChats(_ json: String) {
        for p in chats.values { p.push(json) }
    }

    /// ⌘V, ⌘C, ⌘X and ⌘A in a message panel (AppDelegate's key monitor): the page edits, Swift does the clipboard.
    /// These panels sit outside the menu's usual path (the notices don't even bring the app forward), so the keys did
    /// nothing in them.
    static func editKey(_ event: NSEvent) -> Bool {
        guard event.modifierFlags.intersection([.command, .control, .option, .shift]) == .command,
              let key = event.charactersIgnoringModifiers?.lowercased(), ["c", "x", "v", "a"].contains(key),
              let p = ([notices] + Array(chats.values)).first(where: { $0.panel === event.window }) else { return false }
        switch key {
        case "v":
            if let text = NSPasteboard.general.string(forType: .string) {
                p.run("window.__messages && __messages.paste && __messages.paste(\(literal(text)))")
            }
        case "a":
            p.run("window.__messages && __messages.selectAll && __messages.selectAll()")
        default:
            p.webView.evaluateJavaScript("window.__messages && __messages.copy ? __messages.copy(\(key == "x")) : ''") { value, _ in
                guard let text = value as? String, !text.isEmpty else { return }
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString(text, forType: .string)
            }
        }
        return true
    }

    /// A chat goes among the terminals pinned above the dashboard (a child window of it, like them), so the one clicked
    /// last is on top; without a visible dashboard it's a window of its own.
    private func pin() {
        guard role == .chat, let d = Self.dashboard, d.isVisible, panel.parent !== d else { return }
        panel.setFrame(Self.whole(panel.frame), display: true)
        d.addChildWindow(panel, ordered: .above)
    }

    /// The display chats belong on: the dashboard's while it's on screen (they're pinned to it, and a full-screen
    /// dashboard's space shows nothing of a chat sitting on another display), else the one in use.
    private static func home() -> NSScreen {
        if let d = dashboard, d.isVisible, let s = d.screen { return s }
        return NSScreen.main ?? NSScreen.screens[0]
    }

    /// A chat's frame moved onto that display, all of it (cut to fit only where the display is smaller).
    private static func whole(_ frame: NSRect) -> NSRect {
        let v = home().visibleFrame
        var r = frame
        r.size.width = min(r.width, v.width)
        r.size.height = min(r.height, v.height)
        r.origin.x = min(max(r.minX, v.minX), v.maxX - r.width)
        r.origin.y = min(max(r.minY, v.minY), v.maxY - r.height)
        return r
    }

    /// A display plugged in, out or moved, the dashboard onto another display or in or out of full screen: the chats
    /// on screen follow, whole.
    private static var watchingScreens = false
    private static func watchScreens() {
        guard !watchingScreens else { return }
        watchingScreens = true
        for name in [NSApplication.didChangeScreenParametersNotification, NSWindow.didChangeScreenNotification,
                     NSWindow.didEnterFullScreenNotification, NSWindow.didExitFullScreenNotification] {
            NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { note in
                let displays = note.name == NSApplication.didChangeScreenParametersNotification
                let window = note.object as? NSWindow
                MainActor.assumeIsolated {
                    guard displays || (window != nil && window === dashboard) else { return }
                    for p in chats.values where p.panel.isVisible { p.panel.setFrame(whole(p.panel.frame), display: true) }
                }
            }
        }
    }

    /// The dashboard came to the front: chats opened while it was away pin above it too, so a click on it doesn't bury
    /// them.
    static func pinAll() {
        for p in chats.values where p.panel.isVisible { p.pin() }
    }

    /// Clicked: on top of the other windows pinned above the dashboard (AppKit doesn't reorder children on a click).
    func windowDidBecomeKey(_ notification: Notification) {
        guard role == .chat, let parent = panel.parent, parent.childWindows?.last !== panel else { return }
        parent.removeChildWindow(panel)
        parent.addChildWindow(panel, ordered: .above)
    }

    /// A menu opened on the dashboard (friends, settings, an update): the chats on screen step out of its way and come
    /// back when it closes, like the terminals.
    static func stepAside(_ aside: Bool) {
        for p in chats.values {
            if aside, p.panel.isVisible {
                p.steppedAside = true
                p.panel.parent?.removeChildWindow(p.panel)
                p.panel.orderOut(nil)
            } else if !aside, p.steppedAside {
                p.steppedAside = false
                p.pin()
                p.panel.orderFront(nil)
            }
        }
    }

    /// A chat closed: its panel goes (a new one loads when it's opened again).
    private func closed() {
        guard role == .chat, let friend, Self.chats[friend] === self else { return }
        Self.chats[friend] = nil
        if Self.showing.remove(friend) != nil { Self.tellShowing() }
    }

    private static func tellShowing() {
        guard let data = try? JSONSerialization.data(withJSONObject: Array(showing)), let json = String(data: data, encoding: .utf8) else { return }
        notices.run("window.__messages && __messages.showing(\(json))")
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
            if role == .notices {
                tellFocus()
                // Your XP as it stands, not only when it changes: a day already past five hours lights up at launch.
                if let x = Cloud.shared.state.xp { xp(x) }
            }
        case "layout":
            let size = CGSize(width: number("w"), height: number("h"))
            guard size.width >= 1, size.height >= 1 else {
                if role == .notices { endTakeover() }
                glass.alphaValue = 0
                panel.ignoresMouseEvents = false
                panel.parent?.removeChildWindow(panel)
                panel.orderOut(nil)
                return closed()
            }
            let place = role == .notices ? body["place"] as? String : nil
            let wide = place == "screen" || place == "fire"
            frost(!wide, duration: wide ? 0 : 0.3)
            role == .notices ? placeNotice(size, place: place) : placeChat(size, focus: body["focus"] as? Bool == true)
        case "leaving":
            // The box plays its way out: the frost goes with it.
            frost(false, duration: 0.18)
        case "drag":
            guard role == .chat else { return }
            var origin = panel.frame.origin
            origin.x += number("dx")
            origin.y -= number("dy")
            panel.setFrameOrigin(origin)
        case "dragEnd":
            guard role == .chat else { return }
            panel.setFrame(Self.whole(panel.frame), display: true)
            UserDefaults.standard.set([panel.frame.minX, panel.frame.maxY], forKey: Self.originKey)
        case "openUpdate":
            Self.onOpenUpdate?()
        case "openProfile":
            Self.onOpenProfile?()
        case "openNotifications":
            Self.onOpenNotifications?()
        case "openDanger":
            Self.onOpenDanger?()
        case "endRunaway":
            Self.onEndRunaway?(Int32(number("pid")), number("started"))
        case "openWait":
            guard let sid = body["sid"] as? String, !sid.isEmpty else { return }
            Self.onOpenWait?(sid)
        case "openClash":
            Self.onOpenClash?()
        case "lock":
            // Never longer than 4 s, whatever the page asks.
            Self.keysLockedUntil = ProcessInfo.processInfo.systemUptime + min(max(number("ms"), 0), 4000) / 1000
        case "showing":
            // This chat shows its friend (or no one anymore): no pop-ups for the friends on screen.
            guard role == .chat, let friend else { return }
            if body["id"] as? String == friend { Self.showing.insert(friend) } else { Self.showing.remove(friend) }
            Self.tellShowing()
        case "openChat":
            // Another friend's chat, from this one: a panel of its own.
            Self.openChat(friend: body["id"] as? String ?? "")
        case "copyText":
            // A code block's Copy, or Copy text on a message.
            guard let text = body["text"] as? String, !text.isEmpty else { return }
            NSPasteboard.general.clearContents()
            NSPasteboard.general.setString(text, forType: .string)
        case "log":
            NSLog("messages page: %@", String(describing: body["msg"] ?? ""))
        default:
            break
        }
    }

    /// Bottom-right corner of the screen the user is on, clear of the Dock and the menu bar. The level-up takeover has
    /// that whole screen instead, above the menu bar and the Dock, and takes the clicks while it plays; the flames of a
    /// day past five hours have it short of the menu bar and the Dock, letting every click through to the windows.
    private func placeNotice(_ size: CGSize, place: String?) {
        let s = NSScreen.main ?? NSScreen.screens[0]
        panel.ignoresMouseEvents = place == "fire"
        if place == "screen" {
            panel.level = .screenSaver
            panel.setFrame(s.frame, display: true)
            Self.takeoverOn = true
            NSLog("Orbiterm: level-up takeover on %@", NSStringFromRect(s.frame))
            takeoverGuard?.cancel()
            let work = DispatchWorkItem { [weak self] in
                MainActor.assumeIsolated {
                    self?.endTakeover()
                    self?.panel.orderOut(nil)
                }
            }
            takeoverGuard = work
            DispatchQueue.main.asyncAfter(deadline: .now() + 16, execute: work)
        } else if place == "fire" {
            endTakeover()
            panel.setFrame(s.visibleFrame, display: true)
        } else if place == "center" {
            // The danger alarm: the middle of the screen, clicks going to it alone.
            endTakeover()
            let v = s.visibleFrame
            panel.setFrame(NSRect(x: v.midX - size.width / 2, y: v.midY - size.height / 2, width: size.width, height: size.height), display: true)
        } else {
            endTakeover()
            let v = s.visibleFrame
            panel.setFrame(NSRect(x: v.maxX - size.width - 12, y: v.minY + 12, width: size.width, height: size.height), display: true)
        }
        if !panel.isVisible { panel.orderFrontRegardless() }
    }

    /// The panel back to a notice's: its level, keys free.
    private func endTakeover() {
        takeoverGuard?.cancel()
        takeoverGuard = nil
        panel.level = .floating
        Self.keysLockedUntil = 0
        Self.takeoverOn = false
    }

    /// Where it was left (if that's on the display it belongs on), else the middle of that display; a chat opened while
    /// others are on screen cascades from the frontmost one. Resizing keeps the top-left corner. All of it always on
    /// that display: with several displays it opened where it was left on another one, out of sight behind a
    /// full-screen dashboard, or grew past the bottom of the screen.
    private func placeChat(_ size: CGSize, focus: Bool) {
        var topLeft: NSPoint
        let others = Self.chats.values.filter { $0 !== self && $0.panel.isVisible }.map(\.panel)
        if panel.isVisible {
            topLeft = NSPoint(x: panel.frame.minX, y: panel.frame.maxY)
        } else if let front = NSApp.orderedWindows.first(where: { w in others.contains { $0 === w } }) {
            topLeft = NSPoint(x: front.frame.minX + 34, y: front.frame.maxY - 34)
        } else if let saved = UserDefaults.standard.array(forKey: Self.originKey) as? [Double], saved.count == 2,
                  Self.home().visibleFrame.insetBy(dx: -40, dy: -40).contains(NSPoint(x: saved[0] + 40, y: saved[1] - 20)) {
            topLeft = NSPoint(x: saved[0], y: saved[1])
        } else {
            let v = Self.home().visibleFrame
            topLeft = NSPoint(x: v.midX - size.width / 2, y: v.midY + size.height / 2)
        }
        panel.setFrame(Self.whole(NSRect(x: topLeft.x, y: topLeft.y - size.height, width: size.width, height: size.height)), display: true)
        // While the dashboard has a menu open, a chat opened from elsewhere waits for it to close.
        if Self.chats.values.contains(where: { $0.steppedAside }) {
            steppedAside = true
            return
        }
        pin()
        if focus {
            NSApp.activate(ignoringOtherApps: true)
            panel.makeKeyAndOrderFront(nil)
        } else if !panel.isVisible {
            panel.orderFront(nil)
        }
    }

    /// The panel stays on its own page: a link in a message opens in the browser (PagePolicy).
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        decisionHandler(PagePolicy.decide(action))
    }

    /// The page's process died: load it again (it reports "ready" and asks for the conversations anew). A takeover it
    /// was playing ends with it.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        ready = false
        if role == .notices {
            endTakeover()
            panel.orderOut(nil)
        }
        webView.reload()
    }
}
