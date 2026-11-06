import AppKit
import SwiftUI

/// The single main screen: the live dashboard (plus an optional chats list). Every chat opens in its
/// own window over it; closing a chat window only hides it, Claude keeps running.
@MainActor
final class MainWindowController: NSWindowController, NSWindowDelegate {
    let engine: RadarEngine
    let sidebar = SidebarModel()
    let radar = RadarView()
    let overlay = OverlayController()
    /// Processes left burning a core where nobody sees them; the dashboard sounds the alarm.
    let runaways = Runaways()

    private var chats: [String: ChatWindowController] = [:]
    private var briefs: [String: SessionBrief] = [:]
    private var lastStatus: [String: String] = [:]
    private var lastWinOpen = ""
    /// The terminal window/pane the user touched last; its AI owns the dashboard's top bar until another is touched.
    private var activeTerminalWindow: String?
    private var lastActiveSession = ""
    private var split: ThemedSplitView!
    private var sidebarHost: NSView!
    /// The chat list's narrowest width and the width it opens at (the one it had when it closed).
    private var sidebarMin: NSLayoutConstraint!
    private var sidebarPreferred: NSLayoutConstraint!
    private var sidebarSliding = false
    private var fontSize: CGFloat
    private var cascade = 0
    private var lastVisibility = ""
    /// Sessions to open once the engine has reported its first state (`--open-session` at launch).
    private var pendingOpen: [String] = []
    private var hasState = false

    init(engine: RadarEngine) {
        self.engine = engine
        UserDefaults.standard.register(defaults: ["sidebarHidden": false])
        let saved = UserDefaults.standard.double(forKey: "terminalFontSize")
        // Until the user picks a size here, their iTerm2 one.
        fontSize = saved >= 9 ? CGFloat(saved) : ITermLook.current?.fontSize ?? 13
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1480, height: 900),
                              styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Atalay's Terminal"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = Theme.bg
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 980, height: 600)
        window.collectionBehavior = [.fullScreenPrimary]
        window.tabbingMode = .disallowed
        window.isReleasedWhenClosed = false
        window.center()
        window.setFrameAutosaveName("atalay-terminal.main")
        super.init(window: window)
        window.delegate = self
        MessagePanel.dashboard = window
        radar.handleGit(GitBridge(engine: engine, terminalFolders: { [weak self] in self?.terminalFolders() ?? [] }))
        radar.handleSpend(SpendBridge(engine: engine))
        overlay.manager = self
        buildLayout()
        wireEngine()
        WaitNotifier.shared.titleOf = { [weak self] b in self?.sidebar.customTitles[b.id] ?? b.title }
        MessagePanel.onOpenWait = { [weak self] sid in self?.openFromNotice(sid) }
        runaways.onChange = { [weak self] json in
            self?.radar.push("runaways", json)
            MessagePanel.notices.runaways(json)
        }
        runaways.start()
        observeVisibility()
        PowerSaver.shared.onChange = { [weak self] _ in self?.pushPower() }
        PowerSaver.shared.start()
        NotificationCenter.default.addObserver(self, selector: #selector(themeChanged), name: ThemeStore.changed, object: nil)
        let t = Timer(timeInterval: 2, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                // A Claude session at work is work (Activity, for XP); so is a busy job in a terminal (pushTerminals).
                if self?.briefs.values.contains(where: { $0.live && $0.status == "busy" }) == true { Activity.work() }
                self?.pushTerminals()
                // How long since the last input anywhere on the Mac: the orbit's cinematic camera waits for five
                // minutes of it, and typing in a terminal window counts.
                self?.radar.push("idle", String(format: "%.1f", Social.idleSeconds()))
            }
        }
        t.tolerance = 0.5
        RunLoop.main.add(t, forMode: .common)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    // MARK: layout

    private func buildLayout() {
        guard let window else { return }
        let root = NSView()
        root.wantsLayer = true
        root.layer?.backgroundColor = Theme.bg.cgColor
        window.contentView = root

        let side = NSHostingView(rootView: SidebarView(model: sidebar, actions: SidebarActions(
            open: { [weak self] in self?.openSession($0) },
            fork: { [weak self] in self?.openSession($0, fork: true) },
            newTerminal: { [weak self] in self?.newTerminal(in: $0) },
            reveal: { NSWorkspace.shared.open(URL(fileURLWithPath: $0)) },
            copyId: {
                NSPasteboard.general.clearContents()
                NSPasteboard.general.setString($0, forType: .string)
            },
            close: { [weak self] in self?.toggleSidebar() })))
        sidebarHost = side
        ThemeStore.glow(side, on: ThemeStore.shared.glows, soft: true)
        radar.handleArchive(ArchiveBridge(model: sidebar))

        let split = ThemedSplitView()
        split.isVertical = true
        split.dividerStyle = .thin
        split.addArrangedSubview(side)
        split.addArrangedSubview(radar.webView)
        split.setHoldingPriority(NSLayoutConstraint.Priority(260), forSubviewAt: 0)
        split.setHoldingPriority(NSLayoutConstraint.Priority(240), forSubviewAt: 1)
        self.split = split
        split.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(split)
        let preferred = side.widthAnchor.constraint(equalToConstant: Self.sidebarWidth)
        preferred.priority = .defaultLow
        sidebarPreferred = preferred
        sidebarMin = side.widthAnchor.constraint(greaterThanOrEqualToConstant: 210)
        NSLayoutConstraint.activate([
            split.topAnchor.constraint(equalTo: root.topAnchor),
            split.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            split.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            split.bottomAnchor.constraint(equalTo: root.bottomAnchor),
            sidebarMin,
            side.widthAnchor.constraint(lessThanOrEqualToConstant: 460),
            preferred,
        ])
        radar.onMessage = { [weak self] in self?.handleRadar($0) }
        Cloud.shared.onChange = { [weak self] _ in self?.pushCloud() }
        // Friends and messages: the dashboard (menu, badges) and both message panels hear every live event. Your own
        // XP changing (the daily bonus, a new level) also updates what Cloud knows, so the top bar shows it at once.
        Social.shared.onEvent = { [weak self] json in
            self?.radar.push("social", json)
            MessagePanel.notices.push(json)
            MessagePanel.pushToChats(json)
            if json.contains(#""type":"xp""#) { Cloud.shared.apply(xpEvent: json) }
        }
        // The "update available" notice was clicked: the dashboard in front, on its "what's new" screen.
        MessagePanel.onOpenUpdate = { [weak self] in
            self?.showDashboard()
            self?.radar.push("openUpdate", "null")
        }
        // The daily bonus notice was clicked: the dashboard in front, on your profile.
        MessagePanel.onOpenProfile = { [weak self] in
            self?.showDashboard()
            self?.radar.push("openProfile", "null")
        }
        // A notification from the developer was clicked: the dashboard in front, on the notifications.
        MessagePanel.onOpenNotifications = { [weak self] in
            self?.showDashboard()
            self?.radar.push("openView", "\"notifications\"")
        }
        // The danger alarm's Details: the dashboard in front, its engine-failure panel open.
        MessagePanel.onOpenDanger = { [weak self] in
            self?.showDashboard()
            self?.radar.push("openDanger", "null")
        }
        MessagePanel.onEndRunaway = { [weak self] pid, started in self?.runaways.end(pid: pid, started: started) }
        if UserDefaults.standard.bool(forKey: "sidebarHidden") { side.isHidden = true }
    }

    // MARK: engine

    private func wireEngine() {
        engine.onInit = { [weak self] js in
            self?.radar.push("init", js)
            self?.pushWinOpen(force: true)
        }
        engine.onState = { [weak self] js, list in
            guard let self else { return }
            if !js.isEmpty { self.radar.push("state", js) }
            self.apply(list)
        }
        engine.onEvents = { [weak self] js in self?.radar.push("events", js) }
        engine.onNativeEvents = { [weak self] events in self?.route(events) }
        engine.onHistory = { [weak self] items in self?.sidebar.items = items }
    }

    private func handleRadar(_ msg: [String: Any]) {
        switch msg["type"] as? String {
        case "ready":
            // A reloaded page has no menu open.
            for c in chats.values { c.stepBack() }
            MessagePanel.stepAside(false)
            engine.requestInit()
            lastVisibility = ""
            dashboardVisibilityChanged()
            pushPower()
            pushCloud()
            terminalsJSON = ""
            pushTerminals()
            radar.push("runaways", runaways.json)
            pushActiveSession(force: true)
        case "open": if let sid = msg["sid"] as? String { openSession(sid) }
        case "fork": if let sid = msg["sid"] as? String { openSession(sid, fork: true) }
        case "newTerminal": overlay.showNewTerminal()
        case "openTerminal": if let id = msg["id"] as? String { openTerminal(id) }
        case "endLeftover":
            if let pid = (msg["pid"] as? NSNumber)?.int32Value, let started = (msg["started"] as? NSNumber)?.doubleValue {
                runaways.endLeft(pid: pid, started: started)
            }
        case "endSession": if let sid = msg["sid"] as? String { endSession(sid) }
        case "endRunaway":
            if let pid = (msg["pid"] as? NSNumber)?.int32Value, let started = (msg["started"] as? NSNumber)?.doubleValue {
                runaways.end(pid: pid, started: started)
            }
        // A menu (friends, settings, an update) opened or closed on the dashboard.
        case "modal":
            let open = msg["open"] as? Bool == true
            for c in chats.values { open ? c.stepAside() : c.stepBack() }
            MessagePanel.stepAside(open)
        case "log": NSLog("dashboard page: %@", String(describing: msg["msg"] ?? ""))
        default: break
        }
    }

    /// A dashboard card's red button (the page asked already): Claude stops wherever it runs, and the card goes. A chat in
    /// one of our windows ends like its End button; elsewhere (iTerm2, a split pane) Claude gets SIGTERM.
    private func endSession(_ sid: String) {
        guard let b = briefs[sid], b.live, let pid = b.pid else { return dismiss(sessionId: sid, pid: nil) }
        if let name = Detached.sessionName(hosting: pid) {
            if let c = chats.values.first(where: { $0.detached?.name == name }) { return c.endChat(confirm: false) }
        } else if let c = chat(for: b), c.detached == nil {
            return c.endChat(confirm: false)
        }
        // Another AI tool ends with all it started (Codex's launcher left its own binary running, a new planet).
        for p in (sid.hasPrefix("ai:") ? Self.tree([pid]).reversed() : [pid]) { kill(p, SIGTERM) }
        dismiss(sessionId: sid, pid: pid)
    }

    private func chat(for brief: SessionBrief) -> ChatWindowController? {
        if let tab = brief.tab, let c = chats[tab] { return c }
        return chats.values.first(where: { $0.sessionId == brief.id && !$0.hud.exited })
    }

    /// Chats and terminals keep running in their detached sessions when the app quits, crashes or freezes.
    /// On launch their windows come back attached, so no conversation or terminal is lost.
    func restoreSessions() {
        let registry = engine.registry
        DispatchQueue.global(qos: .utility).async {
            let running = Detached.runningSessions(registry: registry)
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                // Everything comes back hidden, so a launch doesn't throw windows on screen: chats are hexagons on the
                // orbit and in the sidebar, terminals flying (or parked) cars, and a click on one opens its window.
                // A window's tabs and split panes (sessions named after the window's) go back into it.
                // Closed tabs opened into windows of their own come back as windows.
                self.standalone.formIntersection(running.map(\.name))
                self.saveStandalone()
                let panes = running.compactMap { s in self.standalone.contains(s.name) ? nil : Detached.extraInfo(s.name).map { (s, $0) } }
                for s in running where (Detached.extraInfo(s.name) == nil || self.standalone.contains(s.name))
                    && !self.chats.values.contains(where: { $0.detached?.name == s.name }) {
                    self.openWindow(cwd: s.cwd, claudeArgs: s.claude ? [] : nil, sessionId: s.sessionId, title: s.title,
                                    detached: DetachedLink(name: s.name), show: false, restored: true)
                }
                // A parked one stays a car on the orbit.
                for (s, info) in panes where self.parked[s.name] == nil && !self.chats.values.contains(where: { c in c.extras.contains { $0.link?.name == s.name } }) {
                    if let c = self.chats.values.first(where: { $0.detached?.name == info.parent }) {
                        c.adoptPane(session: s.name, kind: info.kind, cwd: s.cwd, focus: false)
                    } else {
                        // Its window's session is gone: on its own.
                        self.openWindow(cwd: s.cwd, claudeArgs: s.claude ? [] : nil, sessionId: s.sessionId, title: s.title,
                                        detached: DetachedLink(name: s.name), show: false, restored: true)
                    }
                }
            }
        }
    }

    /// Opening a session needs to know whether it is running somewhere (else a running chat would be
    /// resumed a second time and Claude would fork it), so it waits for the engine's first state.
    func openWhenReady(_ sids: [String]) {
        if hasState { sids.forEach { openSession($0) } } else { pendingOpen += sids }
    }

    private func apply(_ list: [SessionBrief]) {
        briefs = Dictionary(list.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        if !hasState {
            hasState = true
            let open = pendingOpen
            pendingOpen.removeAll()
            DispatchQueue.main.async { [weak self] in open.forEach { self?.openSession($0) } }
        }
        for c in chats.values {
            let b = list.first(where: { $0.tab == c.id }) ?? c.sessionId.flatMap { briefs[$0] }
            c.apply(b)
        }
        let live = list.filter(\.live)
        let needYou = live.filter { $0.status == "waiting" }.count
        NSApp.dockTile.badgeLabel = needYou > 0 ? "\(needYou)" : nil
        for b in live {
            if let prev = lastStatus[b.id], prev != b.status, !NSApp.isActive,
               b.status == "waiting" || (b.status == "idle" && b.host == "app") {
                NSApp.requestUserAttention(.informationalRequest)
            }
            lastStatus[b.id] = b.status
        }
        WaitNotifier.shared.update(live)
        if sidebar.briefs != briefs { sidebar.briefs = briefs }
        let open = Set(chats.values.compactMap(\.sessionId))
        if sidebar.openInTabs != open { sidebar.openInTabs = open }
        pushWinOpen()
        pushActiveSession()
    }

    private func route(_ events: [NativeEvent]) {
        for e in events {
            let target = briefs[e.sid].flatMap { chat(for: $0) } ?? chats.values.first(where: { $0.sessionId == e.sid })
            target?.hud.push(e)
        }
    }

    /// Tells the dashboard which sessions have a visible chat window (cards light up).
    private func pushWinOpen(force: Bool = false) {
        let map = Dictionary(chats.values.filter { $0.isShown }.compactMap { c in c.sessionId.map { ($0, true) } }, uniquingKeysWith: { a, _ in a })
        guard let data = try? JSONSerialization.data(withJSONObject: map), let js = String(data: data, encoding: .utf8) else { return }
        if !force && js == lastWinOpen { return }
        lastWinOpen = js
        radar.webView.evaluateJavaScript("window.__winOpen = \(js);", completionHandler: nil)
    }

    /// A terminal got the keyboard or input. Resolve the AI under that exact pane, so a Claude and a Codex window can
    /// both be open while the one touched last supplies the top bar's session stats and account limits.
    func terminalFocused(window id: String) {
        activeTerminalWindow = id
        pushActiveSession()
    }

    private func pushActiveSession(force: Bool = false) {
        let shell = activeTerminalWindow.flatMap { chats[$0]?.focusedShellPid } ?? 0
        var best: (brief: SessionBrief, distance: Int)?
        if shell > 0 {
            for b in briefs.values where b.live {
                guard var pid = b.pid else { continue }
                for distance in 0..<10 {
                    if pid == shell {
                        if best == nil || distance < best!.distance { best = (b, distance) }
                        break
                    }
                    guard let parent = Proc.parent(pid), parent > 1 else { break }
                    pid = parent
                }
            }
        }
        let sid = best?.brief.id ?? ""
        guard force || sid != lastActiveSession else { return }
        lastActiveSession = sid
        let json = sid.isEmpty ? "null" : "\"\(sid)\""
        radar.push("activeSession", json)
    }

    // MARK: terminals, the orbit's flying cars

    private var terminalsJSON = ""
    private var terminalCPU: [Int32: (ns: UInt64, at: TimeInterval)] = [:]

    /// Every app terminal without Claude in it, for the dashboard's orbit: each window's own when it's one and every tab
    /// and split pane (Claude in one is a session there), with what runs there (the shell's foreground job, e.g.
    /// `npm run dev`), in which folder, and how busy; and what a closed terminal left running (Runaways.left). Sent when
    /// it changes.
    private func pushTerminals() {
        let now = ProcessInfo.processInfo.systemUptime
        var list: [[String: Any]] = []
        var measured = Set<Int32>()
        // % of a core the processes under `roots` used since the last time (`key`: the shell, or the process left behind).
        func busy(_ key: Int32, _ roots: [Int32], work: Bool) -> Double {
            guard !roots.isEmpty else { return 0 }
            var cpu = 0.0
            let ns = Self.tree(roots).reduce(UInt64(0)) { $0 &+ (Proc.info($1)?.cpuTime ?? 0) }
            if let prev = terminalCPU[key], now > prev.at, ns >= prev.ns {
                cpu = Double(ns - prev.ns) / ((now - prev.at) * 1e9) * 100
            }
            // A build, tests, a dev server recompiling: work (Activity). An idle dev server isn't.
            if work, cpu >= 5 { Activity.work() }
            terminalCPU[key] = (ns, now)
            measured.insert(key)
            return cpu
        }
        // An ended window's other tabs are still running: their cars stay.
        for c in chats.values {
            for pane in c.plainShells() {
                let jobs = Proc.children(of: pane.shell)
                let cwd = Proc.cwd(pane.shell) ?? pane.cwd
                let cpu = busy(pane.shell, jobs, work: true)
                list.append([
                    "id": pane.id, "cwd": tildify(cwd), "dir": (cwd as NSString).lastPathComponent,
                    "cmd": jobs.first.flatMap(Proc.arguments).map(Self.commandLabel) ?? "",
                    "running": !jobs.isEmpty, "cpu": cpu.rounded(),
                ])
            }
        }
        // Closed tabs and panes, still running (an AI in one, Claude or Codex…, is a session on the orbit, not a car).
        var gone = false
        for (name, link) in parked {
            guard let shell = link.shellPid else {
                parked[name] = nil
                gone = true
                continue
            }
            guard !ChatWindowController.runsAgent(shell) else { continue }
            let jobs = Proc.children(of: shell)
            let cwd = Proc.cwd(shell) ?? HOME
            let cpu = busy(shell, jobs, work: true)
            list.append([
                "id": "s:" + name, "cwd": tildify(cwd), "dir": (cwd as NSString).lastPathComponent,
                "cmd": jobs.first.flatMap(Proc.arguments).map(Self.commandLabel) ?? "",
                "running": !jobs.isEmpty, "cpu": cpu.rounded(),
            ])
        }
        if gone { saveParked() }
        for l in runaways.left {
            let cpu = busy(l.pid, [l.pid], work: false)
            list.append([
                "id": "left:\(l.pid):\(Int64(l.started))", "cwd": tildify(l.cwd), "dir": (l.cwd as NSString).lastPathComponent,
                "cmd": Self.commandLabel(l.args), "running": true, "cpu": cpu.rounded(),
                "left": true, "pid": l.pid, "started": l.started,
            ])
        }
        terminalCPU = terminalCPU.filter { measured.contains($0.key) }
        list.sort { ($0["id"] as? String ?? "") < ($1["id"] as? String ?? "") }
        guard let data = try? JSONSerialization.data(withJSONObject: list), let json = String(data: data, encoding: .utf8),
              json != terminalsJSON else { return }
        terminalsJSON = json
        radar.push("terminals", json)
    }

    /// The folders the app's terminals are in now (each shell's own, after its cd's), for Source Control.
    private func terminalFolders() -> [String] {
        var shells: [Int32] = []
        for c in chats.values where !c.hud.exited {
            shells += c.extras.compactMap { $0.link?.shellPid }
            if c.hud.status == "terminal", let shell = c.detached?.shellPid { shells.append(shell) }
        }
        return shells.compactMap(Proc.cwd)
    }

    /// The jobs and everything they started (npm starts node, node starts esbuild, …).
    private static func tree(_ roots: [Int32]) -> [Int32] {
        var all = roots, next = roots
        for _ in 0..<5 where !next.isEmpty {
            next = next.flatMap { Proc.children(of: $0) }
            all += next
        }
        return all
    }

    /// "node /…/node_modules/.bin/vite --port 5173" -> "vite --port 5173"; "npm run dev" stays.
    private static func commandLabel(_ args: [String]) -> String {
        // A process that renamed itself (npm: "npm exec remotion studio") pads its arguments with spaces.
        var parts = args.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
            .map { $0.contains("/") ? ($0 as NSString).lastPathComponent : $0 }
        if let first = parts.first, first == "node" || first == "nodejs", parts.count > 1 { parts.removeFirst() }
        let label = parts.joined(separator: " ")
        return label.count > 48 ? String(label.prefix(47)) + "…" : label
    }

    /// The hacker name, online count and update state, for the brand, settings and update button.
    private func pushCloud() {
        guard let data = try? JSONSerialization.data(withJSONObject: Cloud.shared.json), let js = String(data: data, encoding: .utf8) else { return }
        radar.push("cloud", js)
    }

    /// Another theme (the theme screen): the window's own background and the sidebar's divider; the page, the sidebar
    /// and the chat windows follow by themselves.
    @objc private func themeChanged() {
        window?.backgroundColor = Theme.bg
        window?.contentView?.layer?.backgroundColor = Theme.bg.cgColor
        split?.needsDisplay = true
        ThemeStore.glow(sidebarHost, on: ThemeStore.shared.glows, soft: true)
    }

    // MARK: dashboard visibility

    /// The page renders its 3D view and CSS animations only when someone can see them: full speed when
    /// the dashboard is the key window, slower behind a chat window, paused when hidden or covered.
    private func observeVisibility() {
        let nc = NotificationCenter.default
        let windowNames: [Notification.Name] = [NSWindow.didChangeOcclusionStateNotification, NSWindow.didMiniaturizeNotification,
                                                NSWindow.didDeminiaturizeNotification, NSWindow.didBecomeKeyNotification,
                                                NSWindow.didResignKeyNotification]
        for name in windowNames {
            nc.addObserver(self, selector: #selector(dashboardVisibilityChanged), name: name, object: window)
        }
        let appNames: [Notification.Name] = [NSApplication.didHideNotification, NSApplication.didUnhideNotification,
                                             NSApplication.didBecomeActiveNotification, NSApplication.didResignActiveNotification]
        for name in appNames {
            nc.addObserver(self, selector: #selector(dashboardVisibilityChanged), name: name, object: nil)
        }
    }

    @objc private func dashboardVisibilityChanged() {
        guard let w = window else { return }
        let visible = w.isVisible && w.occlusionState.contains(.visible) && !w.isMiniaturized && !NSApp.isHidden
        let focused = visible && NSApp.isActive && w.isKeyWindow
        let state = "\(visible),\(focused)"
        guard state != lastVisibility else { return }
        lastVisibility = state
        radar.webView.evaluateJavaScript("window.__radar && window.__radar.visibility && window.__radar.visibility(\(visible), \(focused)); true", completionHandler: nil)
    }

    /// On battery or in Low Power Mode the map draws fewer and smaller frames (PowerSaver).
    private func pushPower() {
        radar.push("power", PowerSaver.shared.on ? "true" : "false")
    }

    // MARK: chats

    func showDashboard() {
        window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // Friend chats stay above the dashboard when it's clicked, like the terminals.
    func windowDidBecomeKey(_ notification: Notification) {
        MessagePanel.pinAll()
    }

    /// A terminal in `cwd`, not a chat: a new conversation starts with `claude`, an earlier one in that folder
    /// with `claude -r`. Whatever Claude runs there shows up in the window like any chat.
    func newTerminal(in cwd: String, frame: NSRect? = nil) {
        var isDir: ObjCBool = false
        guard FileManager.default.fileExists(atPath: cwd, isDirectory: &isDir), isDir.boolValue else {
            alert("Folder not found", tildify(cwd))
            return
        }
        makeChat(cwd: cwd, claudeArgs: nil, sessionId: nil, title: (cwd as NSString).lastPathComponent, frame: frame)
    }

    private func openFromNotice(_ sid: String) {
        if !sid.hasPrefix("ai:"), let b = briefs[sid], b.live, b.host == "term", let pid = b.pid,
           Detached.sessionName(hosting: pid, anyBuild: true) == nil {
            return ITerm.reveal(pid: pid)
        }
        NSApp.activate(ignoringOtherApps: true)
        openSession(sid)
    }

    /// Opens a saved or running conversation in its own window, in its project folder.
    func openSession(_ sid: String, fork: Bool = false) {
        let brief = briefs[sid]
        // Another AI tool (Codex…) has no conversation to resume or copy here: a click opens the pane it runs in, when
        // that's one of ours.
        if sid.hasPrefix("ai:") {
            guard !fork, let b = brief, b.live, let pid = b.pid else { return }
            if let tab = b.tab, let c = chats[tab] {
                c.show()
                return c.focusPane(hosting: pid)
            }
            // Running outside the app: its terminal (iTerm2's session, Terminal's tab) comes to the front.
            guard let name = Detached.sessionName(hosting: pid, anyBuild: true) else { return ITerm.reveal(pid: pid) }
            if parked[name] != nil { return reopenParked(name, own: true) }
            if let c = chats.values.first(where: { $0.detached?.name == (Detached.extraInfo(name)?.parent ?? name) }) {
                c.show()
                c.focusPane(hosting: pid)
                return
            }
            // Codex in the installed app can be mirrored in staging just like Claude. Previously this path returned
            // without creating a window, so clicking its planet did nothing.
            let own = name.hasPrefix(Detached.prefix)
            let c = openWindow(cwd: b.cwd, claudeArgs: nil, sessionId: nil, title: b.title.isEmpty ? b.name : b.title,
                               detached: DetachedLink(name: name), mirror: !own)
            c.focusPane(hosting: pid)
            return
        }
        if !fork {
            if let b = brief, b.live, let pid = b.pid {
                // A live chat opens the window its process runs in. Another window here can hold an older copy of the
                // same conversation (a `claude --resume` that didn't fork); that one isn't it. Outside the app: below.
                // On the pane it runs in: a Claude in the window's second tab opens that tab.
                if let tab = b.tab, let c = chats[tab] {
                    c.show()
                    return c.focusPane(hosting: pid)
                }
                // A tab or split pane closed with Claude running in it comes back into its window.
                if let name = Detached.sessionName(hosting: pid), parked[name] != nil { return reopenParked(name, own: true) }
                // A tab or split pane's session goes by its window's.
                if let name = Detached.sessionName(hosting: pid),
                   let c = chats.values.first(where: { $0.detached?.name == (Detached.extraInfo(name)?.parent ?? name) }) {
                    c.show()
                    return c.focusPane(hosting: pid)
                }
            } else {
                if let c = chats.values.first(where: { $0.sessionId == sid && !$0.hud.exited }) { return c.show() }
                if let b = brief, let c = chat(for: b) { return c.show() }
            }
        }
        let item = sidebar.items.first(where: { $0.id == sid })
        let cwd = [item?.cwd, brief?.cwd].compactMap { $0 }.first(where: { !$0.isEmpty }) ?? ""
        var isDir: ObjCBool = false
        guard !cwd.isEmpty, FileManager.default.fileExists(atPath: cwd, isDirectory: &isDir), isDir.boolValue else {
            alert("Project folder not found", cwd.isEmpty ? "Couldn't tell which folder this chat started in." : tildify(cwd))
            return
        }
        let title = [brief?.title, item?.title, item?.lastPrompt, brief?.name].compactMap { $0 }.first(where: { !$0.isEmpty }) ?? String(sid.prefix(8))
        let resume = ["--resume", sid]
        if fork {
            // A copy of a Claude running in iTerm2 ends that original when it ends.
            let original = brief.flatMap { $0.live ? $0.pid : nil }
            return makeChat(cwd: cwd, claudeArgs: resume + ["--fork-session"], sessionId: nil, title: "⑂ " + title,
                            origin: original.flatMap { pid in ITerm.tab(of: pid).map { ITermOrigin(tty: $0, claude: pid) } })
        }
        guard let b = brief, b.live, b.host == "term", let pid = b.pid else {
            return makeChat(cwd: cwd, claudeArgs: resume, sessionId: sid, title: title)
        }
        // One of our sessions whose window is gone: show it again, nothing to move.
        if let name = Detached.sessionName(hosting: pid) {
            openWindow(cwd: cwd, claudeArgs: [], sessionId: sid, title: title, detached: DetachedLink(name: name))
            return
        }
        // Running in another Atalay's Terminal (the installed app and the staging build side by side): a mirror here,
        // a second screen on the same chat. Both windows show it live and type into the one Claude; closing the mirror
        // leaves the chat running there.
        if let name = Detached.sessionName(hosting: pid, anyBuild: true) {
            if let c = chats.values.first(where: { $0.detached?.name == name }) { return c.show() }
            openWindow(cwd: cwd, claudeArgs: [], sessionId: sid, title: "⧉ " + title, detached: DetachedLink(name: name), mirror: true)
            return
        }
        // The conversation is running in another terminal (e.g. iTerm2).
        let busy = b.status == "busy"
        var buttons = ["Open a Copy", "Cancel"]
        if !busy { buttons.insert("Move It Here", at: 0) }
        let r = ask("“\(clip(title, 60))” is open in another terminal",
                    (busy ? "It's working right now, so it can't be moved. " : "Moving it closes Claude in the other terminal and continues the conversation in a window here. ")
                        + "A copy is a separate conversation from this point on: what you write in one doesn't reach the other.",
                    buttons)
        // A copy of a Claude running in iTerm2 ends that original when it ends.
        let copied = ITerm.tab(of: pid).map { ITermOrigin(tty: $0, claude: pid) }
        switch buttons.indices.contains(r) ? buttons[r] : "Cancel" {
        case "Move It Here":
            takeOver(pid: pid, then: { [weak self] in
                         self?.makeChat(cwd: cwd, claudeArgs: resume, sessionId: sid, title: title)
                     },
                     failed: { [weak self] in
                         guard let self else { return }
                         if self.ask("Claude in the other terminal didn't close", "Open a copy instead?", ["Open a Copy", "Cancel"]) == 0 {
                             self.makeChat(cwd: cwd, claudeArgs: resume + ["--fork-session"], sessionId: nil, title: "⑂ " + title,
                                           origin: copied)
                         }
                     })
        case "Open a Copy":
            makeChat(cwd: cwd, claudeArgs: resume + ["--fork-session"], sessionId: nil, title: "⑂ " + title, origin: copied)
        default:
            break
        }
    }

    /// Opens a chat window and starts its shell (and Claude, with `claudeArgs`) in a detached session, so it
    /// outlives the app. The window opens at once; screen starts off the main thread and the window attaches after.
    private func makeChat(cwd: String, claudeArgs: [String]?, sessionId: String?, title: String, origin: ITermOrigin? = nil,
                          frame: NSRect? = nil) {
        guard Detached.available else {
            openWindow(cwd: cwd, claudeArgs: claudeArgs, sessionId: sessionId, title: title, detached: nil, frame: frame).origin = origin
            return
        }
        // A fresh name every time: a session named after the conversation clashed with an older one of the same
        // conversation, and screen refuses `-X quit` when two sessions match, so End did nothing.
        let link = DetachedLink(name: Detached.prefix + UUID().uuidString.lowercased())
        let c = openWindow(cwd: cwd, claudeArgs: claudeArgs, sessionId: sessionId, title: title, detached: link, attach: false, frame: frame)
        c.origin = origin
        Detached.start(name: link.name, cwd: cwd, claudeArgs: claudeArgs) { [weak self, weak c] ok in
            guard let self, let c else { return }
            guard ok else {
                NSLog("Atalay's Terminal: screen couldn't start a session; this chat runs in the app only")
                return c.runLocally(claudeArgs: claudeArgs)
            }
            c.attachSession()
            // The session's shell shows up a moment after screen starts; map it so the dashboard knows the window.
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.syncShells() }
        }
    }

    @discardableResult
    private func openWindow(cwd: String, claudeArgs: [String]?, sessionId: String?, title: String,
                            detached: DetachedLink?, attach: Bool = true, show: Bool = true, mirror: Bool = false,
                            restored: Bool = false, frame: NSRect? = nil) -> ChatWindowController {
        let c = ChatWindowController(cwd: cwd, claudeArgs: claudeArgs, sessionId: sessionId, title: title,
                                     fontSize: fontSize, frame: frame ?? nextChatFrame(), manager: self, detached: detached, mirror: mirror)
        // An exact place (a split's half): the window's frame, title bar included, not just its content.
        if let frame { c.window?.setFrame(frame, display: false) }
        c.takesHistory = restored
        chats[c.id] = c
        if let sessionId, let b = briefs[sessionId] { c.apply(b) } else { c.apply(nil) }
        if show { c.show() }
        syncShells()
        if detached != nil, attach { c.attachSession() }
        return c
    }

    private func nextChatFrame() -> NSRect {
        let base = window?.frame ?? NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let w = min(1100, max(860, base.width * 0.62)), h = min(760, max(560, base.height * 0.72))
        let k = CGFloat(cascade % 6) - 2.5
        cascade += 1
        return NSRect(x: base.midX - w / 2 + k * 28, y: base.midY - h / 2 - k * 24, width: w, height: h)
    }

    // MARK: iTerm2's shortcuts (the Chat and Window menus): tabs and split panes in the window in front
    // (ChatWindowController); with nothing more there to move to, the next window instead.

    /// The chat or terminal window in front, if the key window is one.
    private var activeChat: ChatWindowController? { NSApp.keyWindow?.delegate as? ChatWindowController }

    /// The chat and terminal windows on screen, left to right, then top to bottom.
    private var shownChats: [ChatWindowController] {
        chats.values.filter { $0.isShown && $0.window?.isVisible == true }.sorted { a, b in
            let fa = a.window?.frame ?? .zero, fb = b.window?.frame ?? .zero
            return abs(fa.minX - fb.minX) > 24 ? fa.minX < fb.minX : fa.maxY > fb.maxY
        }
    }

    /// ⌘T / ⌥⌘T: a new tab in the window in front (from the dashboard: the folder picker).
    func newTab() {
        guard let c = activeChat else { return overlay.showNewTerminal() }
        c.newTab()
    }

    /// ⌘D / ⇧⌘D: splits the pane in front.
    func split(vertical: Bool) {
        guard let c = activeChat else { return overlay.showNewTerminal() }
        c.split(vertical: vertical)
    }

    /// ⌘W: the pane in front closes, or with only the window's own, the window.
    func closePane() {
        // A friend's chat in front closes itself (the terminal behind keeps its panes).
        if MessagePanel.closeKeyChat() { return }
        if let c = activeChat, c.closeFocusedPane() { return }
        NSApp.keyWindow?.performClose(nil)
    }

    /// ⌘] / ⌘[: the next or previous pane; ⇧⌘] / ⇧⌘[ (`tabs`): the next or previous tab.
    func selectPane(step: Int, tabs: Bool = false) {
        if let c = activeChat, tabs ? c.selectTab(step: step) : c.selectPane(step: step) { return }
        let list = shownChats
        guard !list.isEmpty else { return }
        guard let i = activeChat.flatMap({ cur in list.firstIndex { $0 === cur } }) else {
            return (step > 0 ? list.first : list.last)?.show() ?? ()
        }
        list[(i + step + list.count) % list.count].show()
    }

    /// ⌥⌘ and an arrow (`dy` up is +1): the pane that way, else the window that way.
    func selectPane(dx: CGFloat, dy: CGFloat) {
        if let c = activeChat, c.selectPane(dx: dx, dy: dy) { return }
        guard let cur = activeChat, let cf = cur.window?.frame else { return selectPane(step: 1) }
        var best: (ChatWindowController, CGFloat)?
        for o in shownChats where o !== cur {
            guard let f = o.window?.frame else { continue }
            let x = f.midX - cf.midX, y = f.midY - cf.midY
            let along = x * dx + y * dy
            guard along > 20 else { continue }
            let score = along + 2 * abs(x * dy - y * dx)
            if best.map({ score < $0.1 }) ?? true { best = (o, score) }
        }
        best?.0.show()
    }

    /// ⌘1–⌘9: that tab of the window in front.
    func selectTab(number n: Int) { activeChat?.selectTab(n - 1) }

    /// ⌃⌘ and an arrow: moves the divider between the panes.
    func moveDivider(dx: CGFloat, dy: CGFloat) { _ = activeChat?.moveDivider(dx: dx, dy: dy) }

    /// ⌥⇧⌘[ / ⌥⇧⌘]: the shown tab a place left or right.
    func moveTab(step: Int) { _ = activeChat?.moveTab(step: step) }

    /// ⇧⌘↩: only the pane in front shows; with a single pane the window fills the screen.
    func toggleMaximize() {
        guard let c = activeChat, !c.toggleZoom() else { return }
        c.toggleMaximize()
    }

    /// What ⇧⌘T can bring back, the latest last: a closed window (hidden; it kept running), or a closed pane, whose
    /// session lives on for a few seconds, like iTerm2's.
    private enum Closed {
        case window(String)
        case pane(window: String, session: String, kind: PaneKind, cwd: String)
    }
    private var closedItems: [Closed] = []

    /// Tabs and split panes closed with ⌘W or their ×, still running as a closed window's chat does: each is a car on the
    /// orbit (Claude in one, a session), and a click brings it back into its window. The window's End Session ends them.
    /// Kept across launches, so they don't come back into their windows by themselves.
    private lazy var parked: [String: DetachedLink] = Dictionary(
        (UserDefaults.standard.stringArray(forKey: "parkedPanes") ?? []).map { ($0, DetachedLink(name: $0)) }, uniquingKeysWith: { a, _ in a })
    private func saveParked() { UserDefaults.standard.set(Array(parked.keys), forKey: "parkedPanes") }

    /// Parked panes opened from their car: windows of their own from then on, after a restart too (their sessions are still
    /// named after the window they were a tab of).
    private lazy var standalone = Set(UserDefaults.standard.stringArray(forKey: "standalonePanes") ?? [])
    private func saveStandalone() { UserDefaults.standard.set(Array(standalone), forKey: "standalonePanes") }

    func closed(_ id: String) {
        closedItems.removeAll { if case .window(id) = $0 { return true } else { return false } }
        remember(.window(id))
    }

    func closedPane(of window: ChatWindowController, session: String, kind: PaneKind, cwd: String) {
        parked[session] = DetachedLink(name: session)
        saveParked()
        remember(.pane(window: window.id, session: session, kind: kind, cwd: cwd))
        pushTerminals()
    }

    /// A parked pane opened again: from its car, in a window of its own (`own`); with ⇧⌘T, back into its window when that's
    /// still here.
    private func reopenParked(_ name: String, own: Bool) {
        guard let link = parked.removeValue(forKey: name) else { return }
        saveParked()
        let cwd = link.shellPid.flatMap(Proc.cwd) ?? HOME
        if !own, let info = Detached.extraInfo(name), let c = chats.values.first(where: { $0.detached?.name == info.parent && !$0.hud.exited }) {
            c.show()
            c.adoptPane(session: name, kind: info.kind, cwd: cwd, focus: true)
        } else {
            standalone.insert(name)
            saveStandalone()
            let claude = link.shellPid.map(ChatWindowController.runsClaude) ?? false
            openWindow(cwd: cwd, claudeArgs: claude ? [] : nil, sessionId: nil, title: (cwd as NSString).lastPathComponent,
                       detached: DetachedLink(name: name))
        }
        pushTerminals()
    }

    /// End Session of a window: its parked tabs and panes end with it.
    func endParked(of window: String) {
        for name in parked.keys where Detached.extraInfo(name)?.parent == window {
            parked[name] = nil
            Detached.quit(name)
        }
        saveParked()
    }

    private func remember(_ item: Closed) {
        closedItems.append(item)
        if closedItems.count > 30 { closedItems.removeFirst() }
    }

    /// ⇧⌘T, iTerm2's Undo Close.
    func undoClose() {
        while let item = closedItems.popLast() {
            switch item {
            case let .window(id):
                if let c = chats[id], !c.isShown, !c.hud.exited { return c.show() }
            case let .pane(_, session, _, _):
                guard parked[session] != nil else { continue }
                return reopenParked(session, own: false)
            }
        }
        NSSound.beep()
    }

    /// Panes came or went in a window: the dashboard learns their shells (now, and once new ones have started).
    func panesChanged() {
        syncShells()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in self?.syncShells() }
    }

    /// A car on the orbit was clicked: its window comes up with that very pane in front (its tab shown, the keyboard in
    /// it), not whichever was used last; a closed tab's car opens in a window of its own.
    private func openTerminal(_ id: String) {
        if let c = chats.values.first(where: { $0.hasCar(id) }) {
            c.show()
            return c.focusCar(id)
        }
        if id.hasPrefix("s:") { reopenParked(String(id.dropFirst(2)), own: true) }
    }

    /// A terminal ended with its End button: its car explodes on the orbit now, not at the next terminals update.
    func terminalEnding(_ id: String) {
        radar.push("terminalGone", "\"\(id)\"")
    }

    func removeChat(_ id: String) {
        guard let c = chats.removeValue(forKey: id) else { return }
        c.endPanes()
        c.window?.parent?.removeChildWindow(c.window!)
        c.window?.orderOut(nil)
        syncShells()
        pushWinOpen()
    }

    func chatProcessEnded(_ id: String) {
        syncShells()
        pushWinOpen()
    }

    func chatVisibilityChanged() { pushWinOpen() }

    private func syncShells() {
        var map: [Int32: String] = [:]
        for c in chats.values {
            for pid in c.shellPids where pid > 0 { map[pid] = c.id }
        }
        engine.setAppShells(map)
    }

    /// Status (busy, idle, waiting) of the live session that process `pid` runs.
    func status(of pid: Int32) -> String? { briefs.values.first(where: { $0.pid == pid })?.status }

    /// Id of the live session that process `pid` runs.
    func sessionId(of pid: Int32) -> String? { briefs.values.first(where: { $0.pid == pid })?.id }

    /// A session the user just ended in a window leaves the dashboard at once (see RadarEngine.dismiss).
    func dismiss(sessionId: String?, pid: Int32?) {
        guard let sessionId else { return }
        engine.dismiss(sessionId: sessionId, pid: pid)
    }

    /// Chats that stop when the app quits: only those whose detached session couldn't start.
    var runningChatCount: Int { chats.values.filter { !$0.hud.exited && $0.detached == nil }.count }

    func terminateAll() {
        for c in chats.values {
            c.saveHistory()
            c.detachPanes()
            c.terminal.terminate()
        }
    }

    private func takeOver(pid: Int32, then: @escaping () -> Void, failed: @escaping () -> Void) {
        kill(pid, SIGTERM)
        DispatchQueue.global(qos: .userInitiated).async {
            for step in 0..<40 {
                if kill(pid, 0) != 0, errno == ESRCH {
                    Thread.sleep(forTimeInterval: 0.3)
                    DispatchQueue.main.async(execute: then)
                    return
                }
                if step == 15 { kill(pid, SIGTERM) }
                Thread.sleep(forTimeInterval: 0.2)
            }
            DispatchQueue.main.async(execute: failed)
        }
    }

    // MARK: view options

    /// The width the chat list had when it last closed: it opens at it again (its preferred width, which the split view
    /// keeps to when nothing else decides).
    private static var sidebarWidth: CGFloat {
        let w = CGFloat(UserDefaults.standard.double(forKey: "sidebarWidth"))
        return (210...460).contains(w) ? w : 280
    }

    /// The chat list slides open and shut, fading as it goes and the dashboard giving it room and taking it back, instead
    /// of snapping. It opens to the width the split view itself gives it, so nothing jumps once the slide is over.
    func toggleSidebar() {
        guard !sidebarSliding else { return }
        let side: NSView = sidebarHost
        let opening = side.isHidden
        var target: CGFloat = 0
        if opening {
            // Measured shown, before anything is drawn; then it starts from nothing.
            side.isHidden = false
            split.adjustSubviews()
            split.layoutSubtreeIfNeeded()
            target = side.frame.width
        } else {
            sidebarPreferred.constant = side.frame.width
            UserDefaults.standard.set(Double(side.frame.width), forKey: "sidebarWidth")
        }
        // While it slides, its width is the animation's alone.
        sidebarMin.isActive = false
        let width = side.widthAnchor.constraint(equalToConstant: opening ? 0 : side.frame.width)
        width.isActive = true
        side.alphaValue = opening ? 0 : 1
        split.layoutSubtreeIfNeeded()
        sidebarSliding = true
        NSAnimationContext.runAnimationGroup({ ctx in
            ctx.duration = 0.45
            ctx.timingFunction = CAMediaTimingFunction(controlPoints: 0.65, 0, 0.35, 1)
            ctx.allowsImplicitAnimation = true
            width.animator().constant = target
            side.animator().alphaValue = opening ? 1 : 0
            self.split.layoutSubtreeIfNeeded()
        }, completionHandler: { [weak self] in
            MainActor.assumeIsolated {
                guard let self else { return }
                width.isActive = false
                if !opening { side.isHidden = true }
                side.alphaValue = 1
                self.sidebarMin.isActive = true
                self.split.adjustSubviews()
                self.sidebarSliding = false
                UserDefaults.standard.set(side.isHidden, forKey: "sidebarHidden")
            }
        })
    }

    func changeFont(by delta: CGFloat?) {
        fontSize = delta.map { min(24, max(9, fontSize + $0)) } ?? ITermLook.current?.fontSize ?? 13
        UserDefaults.standard.set(Double(fontSize), forKey: "terminalFontSize")
        for c in chats.values { c.setFont(fontSize) }
    }

    private func alert(_ title: String, _ text: String) {
        _ = ask(title, text, ["OK"], style: .warning)
    }

    @discardableResult
    private func ask(_ title: String, _ text: String, _ buttons: [String], style: NSAlert.Style = .informational) -> Int {
        let a = NSAlert()
        a.messageText = title
        a.informativeText = text
        a.alertStyle = style
        for b in buttons { a.addButton(withTitle: b) }
        return a.runModal().rawValue - NSApplication.ModalResponse.alertFirstButtonReturn.rawValue
    }
}

final class ThemedSplitView: NSSplitView {
    override var dividerColor: NSColor { NSColor(hex: Theme.accentHex, alpha: 0.22) }
    override var dividerThickness: CGFloat { 1 }
}
