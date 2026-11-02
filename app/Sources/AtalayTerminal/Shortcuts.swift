import AppKit
import WebKit

/// The keyboard shortcuts the user can change (the dashboard's main menu → SHORTCUTS): the menu's actions with the keys
/// they come with (iTerm2's, mostly) or the ones the user set. Kept in UserDefaults ("shortcuts": action id → combo),
/// a combo being "cmd+shift+t" (modifiers, then the key); "" takes the key off the action. The system's own (Quit,
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
        Action(id: "newTerminal", group: "Chats", title: "New terminal", combo: "cmd+n"),
        Action(id: "newTab", group: "Chats", title: "New tab", combo: "cmd+t"),
        Action(id: "newTabNext", group: "Chats", title: "New tab next to the current one", combo: "opt+cmd+t"),
        Action(id: "splitVertically", group: "Chats", title: "Split vertically", combo: "cmd+d"),
        Action(id: "splitHorizontally", group: "Chats", title: "Split horizontally", combo: "shift+cmd+d"),
        Action(id: "shortcutsWheel", group: "Chats", title: "Shortcut wheel", combo: "cmd+k"),
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
        Action(id: "fullScreen", group: "View", title: "Full screen", combo: "ctrl+cmd+f"),
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
        let (key, mods) = parse(combo(id))
        item.keyEquivalent = key
        item.keyEquivalentModifierMask = mods
    }

    /// Sets an action's keys ("" for none): nil, or why not (another action has them, or the system does).
    static func set(_ id: String, _ combo: String) -> String? {
        guard action(id) != nil else { return "unknown action" }
        if !combo.isEmpty {
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

    /// How a combo reads: ⌃⌥⇧⌘ and the key (⌘T, ⇧⌘], ⌥⌘↑).
    static func label(_ combo: String) -> String {
        guard !combo.isEmpty else { return "" }
        var parts = combo.split(separator: "+", omittingEmptySubsequences: false).map(String.init)
        if parts.last == "" { parts.removeLast(); parts[parts.count - 1] = "+" }
        let k = parts.removeLast()
        let glyphs = ["ctrl": "⌃", "opt": "⌥", "shift": "⇧", "cmd": "⌘"]
        let mods = ["ctrl", "opt", "shift", "cmd"].filter(parts.contains).compactMap { glyphs[$0] }.joined()
        let keys = ["up": "↑", "down": "↓", "left": "←", "right": "→", "return": "↩", "tab": "⇥", "space": "Space"]
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
        default:
            if let n = fKeys[event.keyCode] { key = "f\(n)" } else {
                // The key itself, not what Shift or Option make of it (⇧⌘] stays "]").
                guard let c = event.characters(byApplyingModifiers: [])?.lowercased(), c.count == 1,
                      let s = c.unicodeScalars.first, s.value >= 0x20, s.value < 0xF700 else { return nil }
                key = c
            }
        }
        guard !mods.intersection([.control, .option, .command]).isEmpty || key.hasPrefix("f") && key.count > 1 else { return nil }
        var parts: [String] = []
        if mods.contains(.control) { parts.append("ctrl") }
        if mods.contains(.option) { parts.append("opt") }
        if mods.contains(.shift) { parts.append("shift") }
        if mods.contains(.command) { parts.append("cmd") }
        return (parts + [key]).joined(separator: "+")
    }

    // MARK: recording a new one

    private static var recorder: Any?
    private static var recordReply: ((Any?, String?) -> Void)?

    /// The next keys pressed, for the settings page: nothing else gets them (the menus neither). Esc cancels,
    /// Delete takes the keys off; keys that can't be a shortcut are passed over. Ten seconds at most.
    static func record(_ reply: @escaping (Any?, String?) -> Void) {
        stopRecording(["cancel": true])
        recordReply = reply
        recorder = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
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
            case "list": replyHandler(["shortcuts": Shortcuts.list()], nil)
            case "record": Shortcuts.record { value, error in replyHandler(value, error) }
            case "set":
                if let why = Shortcuts.set(id, body["combo"] as? String ?? "") { replyHandler(["error": why], nil) }
                else { replyHandler(["shortcuts": Shortcuts.list()], nil) }
            case "reset":
                Shortcuts.reset(id.isEmpty ? nil : id)
                replyHandler(["shortcuts": Shortcuts.list()], nil)
            default: replyHandler(nil, "unknown request")
            }
        }
    }
}
