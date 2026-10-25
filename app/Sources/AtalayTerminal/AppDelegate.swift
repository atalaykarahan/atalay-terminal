import AppKit
import SwiftTerm

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let engine = RadarEngine()
    private var controller: MainWindowController!
    private var monitors: [Any] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = NSAppearance(named: .darkAqua)
        buildMenu()
        controller = MainWindowController(engine: engine)
        controller.showWindow(nil)
        controller.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        installMonitors()
        if !Trackpad.start() { NSLog("Atalay's Terminal: trackpad finger tracking unavailable; use ⌘K for shortcuts") }
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { _ in
            Trackpad.start()
            // Sleep kills the live line to the API without a word; open a fresh one.
            MainActor.assumeIsolated { Social.shared.kick() }
        }
        engine.start()
        controller.restoreSessions()
        HangWatchdog.shared.start()
        Cloud.shared.installUpdatesRightAway = CommandLine.arguments.contains("--update")
        Cloud.shared.start()
        // Load the message panels' pages now, so a message can pop up at any time.
        _ = MessagePanel.notices
        _ = MessagePanel.chat
        handleLaunchArguments()
    }

    // Closing the dashboard keeps the app (and every running chat) alive; the Dock icon brings it back.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        controller.showDashboard()
        return true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        let running = controller?.runningChatCount ?? 0
        if running > 0 {
            let a = NSAlert()
            a.messageText = running == 1 ? "1 chat is still running" : "\(running) chats are still running"
            a.informativeText = "Quitting stops Claude in those windows, including hidden ones. The conversations stay saved and can be resumed."
            a.alertStyle = .warning
            a.addButton(withTitle: "Quit")
            a.addButton(withTitle: "Cancel")
            if a.runModal() != .alertFirstButtonReturn { return .terminateCancel }
        }
        controller?.terminateAll()
        return .terminateNow
    }

    /// `--new-terminal <folder>` / `--open-session <id>` (repeatable) / `--shortcuts`: open windows or the pie right after launch.
    private func handleLaunchArguments() {
        let args = CommandLine.arguments
        if let i = args.firstIndex(of: "--new-terminal"), i + 1 < args.count {
            controller.newTerminal(in: args[i + 1])
        }
        let sessions = args.indices.filter { args[$0] == "--open-session" && $0 + 1 < args.count }.map { args[$0 + 1] }
        if !sessions.isEmpty { controller.openWhenReady(sessions) }
        if args.contains("--shortcuts") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                guard let f = self?.controller.window?.frame else { return }
                self?.controller.overlay.showShortcuts(at: NSPoint(x: f.midX, y: f.midY))
            }
        }
    }

    private func installMonitors() {
        // Three-finger click anywhere in the app opens the shortcut pie at the pointer. With two-finger
        // secondary click on, macOS delivers it as a right click, so that is caught before any context menu.
        if let m = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown], handler: { [weak self] event in
            guard Trackpad.threeFingersDown, let self else { return event }
            self.controller.overlay.showShortcuts(at: NSEvent.mouseLocation)
            return nil
        }) { monitors.append(m) }

        // Shift+Return inserts a newline in Claude Code (ESC CR), unless the running program
        // enabled the kitty keyboard protocol, in which case SwiftTerm encodes the key itself.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            let mods = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
            guard event.keyCode == 36 || event.keyCode == 76, mods == .shift,
                  let tv = event.window?.firstResponder as? ChatTerminalView,
                  tv.keyboardEnhancementFlags.isEmpty else { return event }
            tv.send(data: [0x1B, 0x0D][...])
            return nil
        }) { monitors.append(m) }
    }

    // MARK: menu

    private func buildMenu() {
        let main = NSMenu()
        func submenu(_ title: String) -> NSMenu {
            let item = NSMenuItem()
            let menu = NSMenu(title: title)
            item.submenu = menu
            main.addItem(item)
            return menu
        }
        @discardableResult
        func add(_ menu: NSMenu, _ title: String, _ action: Selector, _ key: String,
                 _ mods: NSEvent.ModifierFlags = [.command], target: AnyObject? = nil) -> NSMenuItem {
            let item = NSMenuItem(title: title, action: action, keyEquivalent: key)
            item.keyEquivalentModifierMask = mods
            item.target = target
            menu.addItem(item)
            return item
        }

        let app = submenu("Atalay's Terminal")
        add(app, "About Atalay's Terminal", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), "")
        app.addItem(.separator())
        add(app, "Hide Atalay's Terminal", #selector(NSApplication.hide(_:)), "h")
        add(app, "Hide Others", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option])
        app.addItem(.separator())
        add(app, "Quit Atalay's Terminal", #selector(NSApplication.terminate(_:)), "q")

        let file = submenu("Chat")
        add(file, "New Terminal…", #selector(newTerminal), "n", target: self)
        add(file, "Shortcuts", #selector(showShortcuts), "k", target: self)
        file.addItem(.separator())
        add(file, "Close Window", #selector(NSWindow.performClose(_:)), "w")

        let edit = submenu("Edit")
        add(edit, "Copy", #selector(NSText.copy(_:)), "c")
        add(edit, "Paste", #selector(NSText.paste(_:)), "v")
        add(edit, "Select All", #selector(NSText.selectAll(_:)), "a")

        let view = submenu("View")
        add(view, "Dashboard", #selector(showDashboard), "1", target: self)
        add(view, "Reload Dashboard", #selector(reloadDashboard), "r", target: self)
        add(view, "Chats List", #selector(toggleSidebar), "b", target: self)
        view.addItem(.separator())
        add(view, "Bigger Text", #selector(fontBigger), "=", target: self)
        add(view, "Smaller Text", #selector(fontSmaller), "-", target: self)
        add(view, "Default Text Size", #selector(fontReset), "0", target: self)
        view.addItem(.separator())
        add(view, "Enter Full Screen", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control])

        let window = submenu("Window")
        add(window, "Minimize", #selector(NSWindow.performMiniaturize(_:)), "m")
        add(window, "Zoom", #selector(NSWindow.performZoom(_:)), "")
        window.addItem(.separator())
        add(window, "Bring All to Front", #selector(NSApplication.arrangeInFront(_:)), "")

        NSApp.mainMenu = main
        NSApp.windowsMenu = window
    }

    @objc private func newTerminal() { controller.overlay.showNewTerminal() }
    @objc private func showShortcuts() { controller.overlay.showShortcuts(at: NSEvent.mouseLocation) }
    @objc private func showDashboard() { controller.showDashboard() }
    @objc private func reloadDashboard() { controller.radar.reload() }
    @objc private func toggleSidebar() { controller.toggleSidebar() }
    @objc private func fontBigger() { controller.changeFont(by: 1) }
    @objc private func fontSmaller() { controller.changeFont(by: -1) }
    @objc private func fontReset() { controller.changeFont(by: nil) }
}
