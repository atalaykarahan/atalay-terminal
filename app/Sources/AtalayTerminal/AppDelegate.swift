import AppKit
import SwiftTerm

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let engine = RadarEngine()
    private var controller: MainWindowController!
    private var monitors: [Any] = []

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = NSAppearance(named: .darkAqua)
        Mur47.registerFonts()
        buildMenu()
        controller = MainWindowController(engine: engine)
        controller.showWindow(nil)
        // The token savers this build ships go on by themselves the first time (Settings turns them off).
        TokenSavers.autoStart()
        AIColors.autoStart()
        controller.window?.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        installMonitors()
        if !Trackpad.start() { NSLog("Atalay's Terminal: trackpad finger tracking unavailable; ⌃ and the middle mouse button open the shortcut wheel") }
        NSWorkspace.shared.notificationCenter.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { _ in
            Trackpad.start()
            // Sleep kills the live line to the API without a word; open a fresh one.
            MainActor.assumeIsolated { Social.shared.kick() }
        }
        engine.start()
        controller.restoreSessions()
        HangWatchdog.shared.start()
        Cloud.shared.installUpdatesRightAway = CommandLine.arguments.contains("--update")
        // An update restarts the app only when that stops nothing: no chat runs outside its detached session.
        Cloud.shared.canRestart = { [weak self] in (self?.controller?.runningChatCount ?? 0) == 0 }
        Cloud.shared.start()
        // Load the notices' page now, so a message can pop up at any time (chats load when opened).
        _ = MessagePanel.notices
        // A newer build than last time (it updated itself, maybe while the user was away): say so in the corner.
        let build = Cloud.shared.build, last = UserDefaults.standard.integer(forKey: "lastRunBuild")
        if build > 0 {
            if last > 0, build > last { MessagePanel.notices.announce(updated: Cloud.shared.version) }
            UserDefaults.standard.set(build, forKey: "lastRunBuild")
        }
        handleLaunchArguments()
    }

    // Closing the dashboard keeps the app (and every running chat) alive; the Dock icon brings it back.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    // A downloaded update waiting for the user to step away goes in now: the next launch is the new build.
    func applicationWillTerminate(_ notification: Notification) {
        Cloud.shared.installOnQuit()
    }

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
        // A file edited in the last second is saved first (Source Control's editor saves a second after a change).
        guard let controller else { return .terminateNow }
        controller.flushFiles {
            controller.terminateAll()
            NSApp.reply(toApplicationShouldTerminate: true)
        }
        return .terminateLater
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
        // While the level-up takeover plays, keys do nothing, as if the app were hacked for a moment (MessagePanel);
        // once its lock is over, a key ends it.
        if let m = NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp], handler: { event in
            if MessagePanel.holds(event) { return nil }
            // ⌘V, ⌘C, ⌘X and ⌘A in the message panels (MessagePanel.editKey).
            if event.type == .keyDown, MessagePanel.editKey(event) { return nil }
            return event
        }) { monitors.append(m) }

        // Four-finger click anywhere in the app opens the shortcut pie at the pointer (three fingers are taken: many
        // people drag or scroll with them, and each such drag opened the pie). With two-finger
        // secondary click on, macOS delivers it as a right click, so that is caught before any context menu.
        if let m = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown], handler: { [weak self] event in
            guard Trackpad.fourFingersDown, let self else { return event }
            self.controller.overlay.showShortcuts(at: NSEvent.mouseLocation)
            return nil
        }) { monitors.append(m) }
        // The same with a mouse: ⌃ and its middle button (the wheel pressed), or what was set in SHORTCUTS.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .otherMouseDown, handler: { [weak self] event in
            guard Shortcuts.wheelOpens(event), let self else { return event }
            self.controller.overlay.showShortcuts(at: NSEvent.mouseLocation)
            return nil
        }) { monitors.append(m) }

        // The mouse wheel over a terminal goes to the program in front when that is Claude (see ChatTerminalView).
        if let m = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel, handler: { event in
            guard let hit = event.window?.contentView?.hitTest(event.locationInWindow),
                  let tv = sequence(first: hit, next: { $0.superview }).first(where: { $0 is ChatTerminalView }) as? ChatTerminalView,
                  tv.wheelGoesToProgram() else { return event }
            tv.allowMouseReporting = true
            // Not in the middle of a drag that goes to Claude (it ends with the mouse button).
            DispatchQueue.main.async { if !tv.mouseToProgram { tv.allowMouseReporting = false } }
            return event
        }) { monitors.append(m) }

        // Fn+Control with an arrow (or F, C, R) tiles a chat window like macOS does, which it doesn't for windows
        // pinned above the dashboard. On Apple keyboards Fn turns the arrows into Home/End/Page Up/Page Down.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            if MessagePanel.holds(event) { return nil }
            let mods = event.modifierFlags.intersection([.control, .option, .command, .shift])
            guard mods == .control, CGEventSource.flagsState(.combinedSessionState).contains(.maskSecondaryFn),
                  [123, 124, 125, 126, 115, 119, 116, 121, 3, 8, 15].contains(event.keyCode),
                  let chat = event.window?.delegate as? ChatWindowController else { return event }
            chat.tile(key: event.keyCode)
            return nil
        }) { monitors.append(m) }

        // Editing keys the Mac way, in Claude's prompt and the shell's line: Shift/Option+Return a new line (ESC CR),
        // Option+Delete deletes a word back, Option+fn+Delete a word ahead, Option+←/→ jump a word. Option types
        // characters otherwise, so these go as Meta by hand. Not when the program enabled the kitty keyboard
        // protocol: SwiftTerm encodes keys itself then.
        if let m = NSEvent.addLocalMonitorForEvents(matching: .keyDown, handler: { event in
            if MessagePanel.holds(event) { return nil }
            let mods = event.modifierFlags.intersection(.deviceIndependentFlagsMask).subtracting([.numericPad, .function, .capsLock])
            guard mods == .shift || mods == .option, let tv = event.window?.firstResponder as? ChatTerminalView,
                  tv.keyboardEnhancementFlags.isEmpty else { return event }
            let bytes: [UInt8]
            switch (event.keyCode, mods == .option) {
            case (36, _), (76, _): bytes = [0x1B, 0x0D]
            case (51, true): bytes = [0x1B, 0x7F]
            case (117, true): bytes = [0x1B, 0x64]
            case (123, true): bytes = [0x1B, 0x62]
            case (124, true): bytes = [0x1B, 0x66]
            default: return event
            }
            tv.send(data: bytes[...])
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
        // An action whose keys the user can change (Shortcuts, the dashboard's main menu → SHORTCUTS).
        @discardableResult
        func keyed(_ menu: NSMenu, _ id: String, _ title: String, _ action: Selector, target: AnyObject? = nil) -> NSMenuItem {
            let item = Shortcuts.item(id, title: title, action: action, target: target)
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

        // iTerm2's keys (its Shell and Window menus, read from iTerm2 3.7): tabs and split panes in the chat or terminal
        // window in front (Panes.swift).
        let file = submenu("Chat")
        keyed(file, "newTerminal", "New Terminal…", #selector(newTerminal), target: self)
        // VS Code's: a new file in Source Control's editor.
        keyed(file, "newFile", "New File", #selector(newFile), target: self)
        keyed(file, "newTab", "New Tab", #selector(newTab), target: self)
        keyed(file, "newTabNext", "New Tab Next to Current Tab", #selector(newTab), target: self)
        keyed(file, "splitVertically", "Split Vertically", #selector(splitVertically), target: self)
        keyed(file, "splitHorizontally", "Split Horizontally", #selector(splitHorizontally), target: self)
        keyed(file, "shortcutsWheel", "Shortcuts", #selector(showShortcuts), target: self)
        file.addItem(.separator())
        keyed(file, "closePane", "Close", #selector(closePane), target: self)
        keyed(file, "closeWindow", "Close Terminal Window", #selector(NSWindow.performClose(_:)))
        keyed(file, "undoClose", "Undo Close", #selector(undoClose), target: self)

        let edit = submenu("Edit")
        // The file editor's (a web page cuts only through the menu); a terminal has nothing to cut.
        add(edit, "Cut", #selector(NSText.cut(_:)), "x")
        add(edit, "Copy", #selector(NSText.copy(_:)), "c")
        keyed(edit, "copyReply", "Copy Claude's Last Reply", #selector(copyReply), target: self)
        add(edit, "Paste", #selector(NSText.paste(_:)), "v")
        add(edit, "Select All", #selector(NSText.selectAll(_:)), "a")
        // As in iTerm2: find in the terminal in front (its find bar), and clear it.
        edit.addItem(.separator())
        let find = #selector(NSResponder.performTextFinderAction(_:))
        keyed(edit, "find", "Find…", find).tag = NSTextFinder.Action.showFindInterface.rawValue
        keyed(edit, "findNext", "Find Next", find).tag = NSTextFinder.Action.nextMatch.rawValue
        keyed(edit, "findPrevious", "Find Previous", find).tag = NSTextFinder.Action.previousMatch.rawValue
        keyed(edit, "findSelection", "Use Selection for Find", find).tag = NSTextFinder.Action.setSearchString.rawValue
        edit.addItem(.separator())
        keyed(edit, "clearBuffer", "Clear Buffer", #selector(clearBuffer), target: self)

        let view = submenu("View")
        add(view, "Dashboard", #selector(showDashboard), "", target: self)
        keyed(view, "reloadDashboard", "Reload Dashboard", #selector(reloadDashboard), target: self)
        keyed(view, "chatsList", "Chats List", #selector(toggleSidebar), target: self)
        view.addItem(.separator())
        keyed(view, "biggerText", "Bigger Text", #selector(fontBigger), target: self)
        keyed(view, "smallerText", "Smaller Text", #selector(fontSmaller), target: self)
        keyed(view, "defaultText", "Default Text Size", #selector(fontReset), target: self)
        view.addItem(.separator())
        keyed(view, "fullScreen", "Enter Full Screen", #selector(NSWindow.toggleFullScreen(_:)))
        view.addItem(.separator())
        keyed(view, "scrollLineUp", "Scroll Up One Line", #selector(scrollLineUp), target: self)
        keyed(view, "scrollLineDown", "Scroll Down One Line", #selector(scrollLineDown), target: self)
        keyed(view, "scrollPageUp", "Scroll Up One Page", #selector(scrollPageUp), target: self)
        keyed(view, "scrollPageDown", "Scroll Down One Page", #selector(scrollPageDown), target: self)
        keyed(view, "scrollTop", "Scroll to Top", #selector(scrollTop), target: self)
        keyed(view, "scrollBottom", "Scroll to Bottom", #selector(scrollBottom), target: self)

        let window = submenu("Window")
        add(window, "Minimize", #selector(NSWindow.performMiniaturize(_:)), "m")
        add(window, "Zoom", #selector(NSWindow.performZoom(_:)), "")
        window.addItem(.separator())
        keyed(window, "nextTab", "Select Next Tab", #selector(nextTab), target: self)
        keyed(window, "previousTab", "Select Previous Tab", #selector(previousTab), target: self)
        keyed(window, "moveTabLeft", "Move Tab Left", #selector(moveTabLeft), target: self)
        keyed(window, "moveTabRight", "Move Tab Right", #selector(moveTabRight), target: self)
        keyed(window, "nextPane", "Next Pane", #selector(nextPane), target: self)
        keyed(window, "previousPane", "Previous Pane", #selector(previousPane), target: self)
        keyed(window, "paneAbove", "Select Pane Above", #selector(paneAbove), target: self)
        keyed(window, "paneBelow", "Select Pane Below", #selector(paneBelow), target: self)
        keyed(window, "paneLeft", "Select Pane Left", #selector(paneLeft), target: self)
        keyed(window, "paneRight", "Select Pane Right", #selector(paneRight), target: self)
        keyed(window, "dividerUp", "Move Divider Up", #selector(dividerUp), target: self)
        keyed(window, "dividerDown", "Move Divider Down", #selector(dividerDown), target: self)
        keyed(window, "dividerLeft", "Move Divider Left", #selector(dividerLeft), target: self)
        keyed(window, "dividerRight", "Move Divider Right", #selector(dividerRight), target: self)
        keyed(window, "maximizePane", "Maximize Active Pane", #selector(maximizePane), target: self)
        // ⌘1–⌘9: that tab of the window in front, as in iTerm2.
        for n in 1...9 { add(window, "Select Tab \(n)", #selector(selectTabNumber(_:)), "\(n)", target: self).tag = n }
        window.addItem(.separator())
        add(window, "Bring All to Front", #selector(NSApplication.arrangeInFront(_:)), "")

        NSApp.mainMenu = main
        NSApp.windowsMenu = window
    }

    @objc private func newTerminal() { controller.overlay.showNewTerminal() }
    @objc private func newFile() { controller.newFile() }
    @objc private func newTab() { controller.newTab() }
    @objc private func splitVertically() { controller.split(vertical: true) }
    @objc private func splitHorizontally() { controller.split(vertical: false) }
    @objc private func closePane() { controller.closePane() }
    @objc private func nextTab() { controller.selectPane(step: 1, tabs: true) }
    @objc private func previousTab() { controller.selectPane(step: -1, tabs: true) }
    @objc private func moveTabLeft() { controller.moveTab(step: -1) }
    @objc private func moveTabRight() { controller.moveTab(step: 1) }
    @objc private func undoClose() { controller.undoClose() }
    @objc private func nextPane() { controller.selectPane(step: 1) }
    @objc private func previousPane() { controller.selectPane(step: -1) }
    @objc private func paneAbove() { controller.selectPane(dx: 0, dy: 1) }
    @objc private func paneBelow() { controller.selectPane(dx: 0, dy: -1) }
    @objc private func paneLeft() { controller.selectPane(dx: -1, dy: 0) }
    @objc private func paneRight() { controller.selectPane(dx: 1, dy: 0) }
    @objc private func dividerUp() { controller.moveDivider(dx: 0, dy: 1) }
    @objc private func dividerDown() { controller.moveDivider(dx: 0, dy: -1) }
    @objc private func dividerLeft() { controller.moveDivider(dx: -1, dy: 0) }
    @objc private func dividerRight() { controller.moveDivider(dx: 1, dy: 0) }
    @objc private func maximizePane() { controller.toggleMaximize() }
    @objc private func selectTabNumber(_ sender: NSMenuItem) { controller.selectTab(number: sender.tag) }
    /// The terminal in front (a chat's or a terminal's, the pane with the keyboard).
    private var frontTerminal: ChatTerminalView? { NSApp.keyWindow?.firstResponder as? ChatTerminalView }
    @objc private func clearBuffer() { frontTerminal?.clearBuffer() }
    @objc private func scrollLineUp() { frontTerminal?.scrollBuffer(.lineUp) }
    @objc private func scrollLineDown() { frontTerminal?.scrollBuffer(.lineDown) }
    @objc private func scrollPageUp() { frontTerminal?.scrollBuffer(.pageUp) }
    @objc private func scrollPageDown() { frontTerminal?.scrollBuffer(.pageDown) }
    @objc private func scrollTop() { frontTerminal?.scrollBuffer(.top) }
    @objc private func scrollBottom() { frontTerminal?.scrollBuffer(.bottom) }
    /// The chat window in front: Claude's last reply onto the clipboard, all of it.
    @objc private func copyReply() { (NSApp.keyWindow?.delegate as? ChatWindowController)?.copyLastReply() }
    @objc private func showShortcuts() { controller.overlay.showShortcuts(at: NSEvent.mouseLocation) }
    @objc private func showDashboard() { controller.showDashboard() }
    @objc private func reloadDashboard() { controller.radar.reload() }
    @objc private func toggleSidebar() { controller.toggleSidebar() }
    @objc private func fontBigger() { controller.changeFont(by: 1) }
    @objc private func fontSmaller() { controller.changeFont(by: -1) }
    @objc private func fontReset() { controller.changeFont(by: nil) }
}
