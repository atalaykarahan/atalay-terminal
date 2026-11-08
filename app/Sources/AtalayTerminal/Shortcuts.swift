import AppKit
import WebKit

/// The keyboard shortcuts the user can change (the dashboard's main menu → SHORTCUTS): the menu's actions with the keys
/// they come with (iTerm2's, mostly) or the ones the user set. Kept in UserDefaults ("shortcuts": action id → combo),
/// a combo being "cmd+shift+t" (modifiers, then the key); "" takes the key off the action. The shortcut wheel can take a
/// mouse button instead of a key: "ctrl+mouse2" (NSEvent.buttonNumber 2, the middle one). The system's own (Quit,
/// Hide, Copy, Paste, Select All, Minimize) and ⌘1–⌘9 (a window's tabs) stay as they are.
@MainActor
enum Shortcuts {
    struct Action {
        let id: String
        let group: String
        let title: String
        let combo: String
    }

    static let actions: [Action] = [
        // ⌘N is VS Code's new file (Source Control's editor); a terminal takes ⇧⌘N, VS Code's new window.
        Action(id: "newTerminal", group: "Chats", title: "New terminal", combo: "shift+cmd+n"),
        Action(id: "newFile", group: "Editor", title: "New file", combo: "cmd+n"),
        Action(id: "newTab", group: "Chats", title: "New tab", combo: "cmd+t"),
        Action(id: "newTabNext", group: "Chats", title: "New tab next to the current one", combo: "opt+cmd+t"),
        Action(id: "splitVertically", group: "Chats", title: "Split vertically", combo: "cmd+d"),
        Action(id: "splitHorizontally", group: "Chats", title: "Split horizontally", combo: "shift+cmd+d"),
        // Its second way to open (the first is the trackpad's four-finger click): keys, or a mouse button with modifiers.
        Action(id: "shortcutsWheel", group: "Chats", title: "Shortcut wheel", combo: "ctrl+mouse2"),
        Action(id: "copyReply", group: "Chats", title: "Copy Claude's last reply", combo: "shift+cmd+c"),
        Action(id: "closePane", group: "Chats", title: "Close the tab or pane", combo: "cmd+w"),
        Action(id: "closeWindow", group: "Chats", title: "Close the terminal window", combo: "shift+cmd+w"),
        Action(id: "undoClose", group: "Chats", title: "Undo close", combo: "shift+cmd+t"),
        Action(id: "nextTab", group: "Tabs and panes", title: "Next tab", combo: "shift+cmd+]"),
        Action(id: "previousTab", group: "Tabs and panes", title: "Previous tab", combo: "shift+cmd+["),
        Action(id: "moveTabLeft", group: "Tabs and panes", title: "Move the tab left", combo: "opt+shift+cmd+["),
        Action(id: "moveTabRight", group: "Tabs and panes", title: "Move the tab right", combo: "opt+shift+cmd+]"),
        Action(id: "nextPane", group: "Tabs and panes", title: "Next pane", combo: "cmd+]"),
        Action(id: "previousPane", group: "Tabs and panes", title: "Previous pane", combo: "cmd+["),
        Action(id: "paneAbove", group: "Tabs and panes", title: "Pane above", combo: "opt+cmd+up"),
        Action(id: "paneBelow", group: "Tabs and panes", title: "Pane below", combo: "opt+cmd+down"),
        Action(id: "paneLeft", group: "Tabs and panes", title: "Pane on the left", combo: "opt+cmd+left"),
        Action(id: "paneRight", group: "Tabs and panes", title: "Pane on the right", combo: "opt+cmd+right"),
        Action(id: "dividerUp", group: "Tabs and panes", title: "Move the divider up", combo: "ctrl+cmd+up"),
        Action(id: "dividerDown", group: "Tabs and panes", title: "Move the divider down", combo: "ctrl+cmd+down"),
        Action(id: "dividerLeft", group: "Tabs and panes", title: "Move the divider left", combo: "ctrl+cmd+left"),
        Action(id: "dividerRight", group: "Tabs and panes", title: "Move the divider right", combo: "ctrl+cmd+right"),
        Action(id: "maximizePane", group: "Tabs and panes", title: "Maximize the pane", combo: "shift+cmd+return"),
        Action(id: "reloadDashboard", group: "View", title: "Reload the dashboard", combo: "cmd+r"),
        Action(id: "chatsList", group: "View", title: "Chats list", combo: "cmd+b"),
        Action(id: "biggerText", group: "View", title: "Bigger text", combo: "cmd+="),
        Action(id: "smallerText", group: "View", title: "Smaller text", combo: "cmd+-"),
        Action(id: "defaultText", group: "View", title: "Default text size", combo: "cmd+0"),
        Action(id: "fullScreen", group: "View", title: "Full screen", combo: "cmd+return"),
        // iTerm2's own: find in the terminal, clear it, move through its history.
        Action(id: "find", group: "Terminal", title: "Find", combo: "cmd+f"),
        Action(id: "findNext", group: "Terminal", title: "Find next", combo: "cmd+g"),
        Action(id: "findPrevious", group: "Terminal", title: "Find previous", combo: "shift+cmd+g"),
        Action(id: "findSelection", group: "Terminal", title: "Find the selected text", combo: "cmd+e"),
        Action(id: "clearBuffer", group: "Terminal", title: "Clear the buffer", combo: "cmd+k"),
        Action(id: "scrollLineUp", group: "Terminal", title: "Scroll up a line", combo: "cmd+up"),
        Action(id: "scrollLineDown", group: "Terminal", title: "Scroll down a line", combo: "cmd+down"),
        Action(id: "scrollPageUp", group: "Terminal", title: "Scroll up a page", combo: "cmd+pageup"),
        Action(id: "scrollPageDown", group: "Terminal", title: "Scroll down a page", combo: "cmd+pagedown"),
        Action(id: "scrollTop", group: "Terminal", title: "Scroll to the top", combo: "cmd+home"),
        Action(id: "scrollBottom", group: "Terminal", title: "Scroll to the bottom", combo: "cmd+end"),
    ]

    /// Keys the system or the app keeps for itself, with what they do.
    private static let reserved: [String: String] = {
        var r = ["cmd+q": "Quit", "cmd+h": "Hide", "opt+cmd+h": "Hide Others", "cmd+c": "Copy", "cmd+v": "Paste",
                 "cmd+a": "Select All", "cmd+m": "Minimize", "cmd+,": "Settings"]
        for n in 1...9 { r["cmd+\(n)"] = "the window's tab \(n)" }
        return r
    }()

    private static let key = "shortcuts"
    private static var items: [String: NSMenuItem] = [:]
    private static var saved: [String: String] { UserDefaults.standard.dictionary(forKey: key) as? [String: String] ?? [:] }

    static func action(_ id: String) -> Action? { actions.first { $0.id == id } }
    static func combo(_ id: String) -> String { saved[id] ?? action(id)?.combo ?? "" }

    /// A menu item for an action, with its keys; kept so a change applies to it at once.
    static func item(_ id: String, title: String, action: Selector, target: AnyObject?) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: action, keyEquivalent: "")
        item.target = target
        items[id] = item
        apply(id)
        return item
    }

    private static func apply(_ id: String) {
        guard let item = items[id] else { return }
        // A mouse button isn't the menu's: the app's mouse monitor opens the wheel (wheelOpens).
        let (key, mods) = isMouse(combo(id)) ? ("", []) : parse(combo(id))
        item.keyEquivalent = key
        item.keyEquivalentModifierMask = mods
    }

    /// Sets an action's keys ("" for none): nil, or why not (another action has them, or the system does).
    static func set(_ id: String, _ combo: String) -> String? {
        guard action(id) != nil else { return "unknown action" }
        if isMouse(combo), id != "shortcutsWheel" { return "only the shortcut wheel opens with the mouse" }
        if !combo.isEmpty, !isMouse(combo) {
            if let what = reserved[combo] { return "\(label(combo)) is \(what)" }
            if let other = actions.first(where: { $0.id != id && Self.combo($0.id) == combo }) {
                return "\(label(combo)) is already \(other.title.lowercased())"
            }
        }
        var all = saved
        if combo == action(id)?.combo { all[id] = nil } else { all[id] = combo }
        UserDefaults.standard.set(all, forKey: key)
        apply(id)
        return nil
    }

    static func reset(_ id: String?) {
        var all = saved
        if let id { all[id] = nil } else { all = [:] }
        UserDefaults.standard.set(all, forKey: key)
        for a in actions where id == nil || a.id == id { apply(a.id) }
    }

    static func state() -> [String: Any] { ["shortcuts": list()] }

    static func list() -> [[String: Any]] {
        actions.map { a in
            let c = combo(a.id)
            return ["id": a.id, "group": a.group, "title": a.title, "combo": c, "label": label(c), "changed": c != a.combo]
        }
    }

    // MARK: combos

    private static let named: [String: String] = [
        "up": String(Character(UnicodeScalar(UInt32(NSUpArrowFunctionKey))!)),
        "down": String(Character(UnicodeScalar(UInt32(NSDownArrowFunctionKey))!)),
        "left": String(Character(UnicodeScalar(UInt32(NSLeftArrowFunctionKey))!)),
        "right": String(Character(UnicodeScalar(UInt32(NSRightArrowFunctionKey))!)),
        "pageup": String(Character(UnicodeScalar(UInt32(NSPageUpFunctionKey))!)),
        "pagedown": String(Character(UnicodeScalar(UInt32(NSPageDownFunctionKey))!)),
        "home": String(Character(UnicodeScalar(UInt32(NSHomeFunctionKey))!)),
        "end": String(Character(UnicodeScalar(UInt32(NSEndFunctionKey))!)),
        "return": "\r", "tab": "\t", "space": " ",
    ]
    private static let fKeys: [UInt16: Int] = [122: 1, 120: 2, 99: 3, 118: 4, 96: 5, 97: 6, 98: 7, 100: 8, 101: 9, 109: 10, 103: 11, 111: 12]

    /// The menu item's key and modifiers for a combo.
    private static func parse(_ combo: String) -> (String, NSEvent.ModifierFlags) {
        guard !combo.isEmpty else { return ("", []) }
        var parts = combo.split(separator: "+", omittingEmptySubsequences: false).map(String.init)
        // "cmd++" would split into an empty last part: the key is "+".
        if parts.last == "" { parts.removeLast(); parts[parts.count - 1] = "+" }
        let k = parts.removeLast()
        var mods: NSEvent.ModifierFlags = []
        for m in parts {
            switch m {
            case "ctrl": mods.insert(.control)
            case "opt": mods.insert(.option)
            case "shift": mods.insert(.shift)
            case "cmd": mods.insert(.command)
            default: break
            }
        }
        if let n = named[k] { return (n, mods) }
        if k.hasPrefix("f"), let n = Int(k.dropFirst()), (1...12).contains(n) {
            return (String(Character(UnicodeScalar(UInt32(NSF1FunctionKey + n - 1))!)), mods)
        }
        return (k, mods)
    }

    /// How a combo reads: ⌃⌥⇧⌘ and the key (⌘T, ⇧⌘], ⌥⌘↑), or a mouse button (⌃ + middle click).
    static func label(_ combo: String) -> String {
        guard !combo.isEmpty else { return "" }
        var parts = combo.split(separator: "+", omittingEmptySubsequences: false).map(String.init)
        if parts.last == "" { parts.removeLast(); parts[parts.count - 1] = "+" }
        let k = parts.removeLast()
        let glyphs = ["ctrl": "⌃", "opt": "⌥", "shift": "⇧", "cmd": "⌘"]
        let mods = ["ctrl", "opt", "shift", "cmd"].filter(parts.contains).compactMap { glyphs[$0] }.joined()
        if let n = mouseButton(k) {
            let name = [2: "middle click", 3: "back button", 4: "forward button"][n] ?? "mouse button \(n + 1)"
            return mods.isEmpty ? name : mods + " + " + name
        }
        let keys = ["up": "↑", "down": "↓", "left": "←", "right": "→", "return": "↩", "tab": "⇥", "space": "Space",
                    "pageup": "⇞", "pagedown": "⇟", "home": "↖", "end": "↘"]
        return mods + (keys[k] ?? k.uppercased())
    }

    /// The combo a key press makes, or nil when it can't be a shortcut (no ⌘, ⌃ or ⌥, except the F keys).
    static func combo(of event: NSEvent) -> String? {
        let mods = event.modifierFlags.intersection([.control, .option, .shift, .command])
        let key: String
        switch event.keyCode {
        case 126: key = "up"
        case 125: key = "down"
        case 123: key = "left"
        case 124: key = "right"
        case 36, 76: key = "return"
        case 48: key = "tab"
        case 49: key = "space"
        case 116: key = "pageup"
        case 121: key = "pagedown"
        case 115: key = "home"
        case 119: key = "end"
        default:
            if let n = fKeys[event.keyCode] { key = "f\(n)" } else {
                // The key itself, not what Shift or Option make of it (⇧⌘] stays "]").
                guard let c = event.characters(byApplyingModifiers: [])?.lowercased(), c.count == 1,
                      let s = c.unicodeScalars.first, s.value >= 0x20, s.value < 0xF700 else { return nil }
                key = c
            }
        }
        guard !mods.intersection([.control, .option, .command]).isEmpty || key.hasPrefix("f") && key.count > 1 else { return nil }
        return (modifiers(mods) + [key]).joined(separator: "+")
    }

    // MARK: the shortcut wheel's mouse button

    private static func mouseButton(_ key: String) -> Int? {
        key.hasPrefix("mouse") ? Int(key.dropFirst(5)).flatMap { $0 >= 2 ? $0 : nil } : nil
    }

    private static func isMouse(_ combo: String) -> Bool {
        combo.split(separator: "+").last.map { mouseButton(String($0)) != nil } ?? false
    }

    private static func modifiers(_ flags: NSEvent.ModifierFlags) -> [String] {
        var parts: [String] = []
        if flags.contains(.control) { parts.append("ctrl") }
        if flags.contains(.option) { parts.append("opt") }
        if flags.contains(.shift) { parts.append("shift") }
        if flags.contains(.command) { parts.append("cmd") }
        return parts
    }

    /// The combo a mouse button makes with the modifiers held (not the left or right button: they're the mouse's own).
    static func mouseCombo(of event: NSEvent) -> String? {
        guard event.type == .otherMouseDown, event.buttonNumber >= 2 else { return nil }
        return (modifiers(event.modifierFlags) + ["mouse\(event.buttonNumber)"]).joined(separator: "+")
    }

    /// Whether this press opens the shortcut wheel (its second way, when that's a mouse button).
    static func wheelOpens(_ event: NSEvent) -> Bool {
        guard recorder == nil, let c = mouseCombo(of: event) else { return false }
        return c == combo("shortcutsWheel")
    }

    // MARK: recording a new one

    private static var recorder: Any?
    private static var recordReply: ((Any?, String?) -> Void)?

    /// The next keys pressed, for the settings page: nothing else gets them (the menus neither). Esc cancels,
    /// Delete takes the keys off; keys that can't be a shortcut are passed over. Ten seconds at most. `mouse`: a mouse
    /// button pressed (with the modifiers held) counts too, for the shortcut wheel.
    static func record(mouse: Bool = false, _ reply: @escaping (Any?, String?) -> Void) {
        stopRecording(["cancel": true])
        recordReply = reply
        recorder = NSEvent.addLocalMonitorForEvents(matching: mouse ? [.keyDown, .otherMouseDown] : .keyDown) { event in
            if event.type == .otherMouseDown {
                if let c = mouseCombo(of: event) { stopRecording(["combo": c, "label": label(c)]) }
                return nil
            }
            let plain = event.modifierFlags.intersection([.control, .option, .shift, .command]).isEmpty
            if plain && event.keyCode == 53 { stopRecording(["cancel": true]) }
            else if plain && (event.keyCode == 51 || event.keyCode == 117) { stopRecording(["combo": ""]) }
            else if let c = combo(of: event) { stopRecording(["combo": c, "label": label(c)]) }
            return nil
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
            if recordReply != nil { stopRecording(["cancel": true]) }
        }
    }

    private static func stopRecording(_ answer: [String: Any]) {
        if let r = recorder { NSEvent.removeMonitor(r) }
        recorder = nil
        let reply = recordReply
        recordReply = nil
        reply?(answer, nil)
    }
}

/// The settings page's shortcut requests (web/cloud.js, SHORTCUTS): the list, recording keys, setting and resetting.
final class KeysBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let id = body["id"] as? String ?? ""
        MainActor.assumeIsolated {
            switch body["type"] as? String {
            case "list": replyHandler(Shortcuts.state(), nil)
            case "record": Shortcuts.record(mouse: body["mouse"] as? Bool == true) { value, error in replyHandler(value, error) }
            case "set":
                if let why = Shortcuts.set(id, body["combo"] as? String ?? "") { replyHandler(["error": why], nil) }
                else { replyHandler(Shortcuts.state(), nil) }
            case "reset":
                Shortcuts.reset(id.isEmpty ? nil : id)
                replyHandler(Shortcuts.state(), nil)
            default: replyHandler(nil, "unknown request")
            }
        }
    }
}
