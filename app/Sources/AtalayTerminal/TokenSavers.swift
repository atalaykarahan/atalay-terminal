import AppKit
import WebKit

/// The token savers for the AI tools on this Mac, both shipped in the app and on from its first launch that has them,
/// without asking; Settings turns each off (and on again).
/// - rtk (github.com/rtk-ai/rtk, Apache-2.0) shortens what commands print before Claude Code or Codex reads it: the
///   app's copy goes to Application Support (a path that outlives the app's updates) and sets itself up as `rtk init`
///   does, a hook in Claude Code and its notes in Codex's AGENTS.md. Off: `rtk init --uninstall`.
/// - caveman (github.com/JuliusBrussee/caveman, MIT) makes Claude Code and Codex answer tersely: its rules at the start
///   of every session and a one-line reminder with every prompt (two hooks in Claude Code's settings that print the
///   app's copies, no Node needed), and the rules in Codex's AGENTS.md. Off: the hooks and the rules go.
/// One the user set up themselves (their own rtk hook, the caveman plugin) is theirs: the app leaves it alone and only
/// shows it.
enum TokenSavers {
    enum Kind: String, CaseIterable { case rtk, caveman }

    private static let support = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    private static var codex: Bool { FileManager.default.fileExists(atPath: HOME + "/.codex") }
    private static var settingsFile: String { CLAUDE_DIR + "/settings.json" }

    /// On or off as the user left it; missing: not decided yet (the first launch that has it turns it on).
    private static func key(_ kind: Kind) -> String { kind == .rtk ? "tokenSavers" : "tokenSaverCaveman" }

    /// Turns on, at a launch, the savers this build has that were never decided: off only when the user turns it off.
    static func autoStart() {
        // One of the user's own stays undecided: if it goes one day, the app's comes on at the next launch.
        for kind in Kind.allCases where UserDefaults.standard.object(forKey: key(kind)) == nil && available(kind) && theirs(kind) == nil {
            set(kind, true)
        }
    }

    static func available(_ kind: Kind) -> Bool {
        switch kind {
        case .rtk: return bundledRtk != nil || theirs(.rtk) != nil
        case .caveman: return bundledCaveman != nil || theirs(.caveman) != nil
        }
    }

    /// Settings' switches. Done on a background queue: they write the tools' settings.
    static func set(_ kind: Kind, _ on: Bool, done: (@MainActor () -> Void)? = nil) {
        UserDefaults.standard.set(on, forKey: key(kind))
        DispatchQueue.global(qos: .utility).async {
            if theirs(kind) == nil {
                switch (kind, on) {
                case (.rtk, true): installRtk()
                case (.rtk, false): uninstallRtk()
                case (.caveman, true): installCaveman()
                case (.caveman, false): uninstallCaveman()
                }
            }
            DispatchQueue.main.async { MainActor.assumeIsolated { done?() } }
        }
    }

    /// What one the user set up themselves runs: their rtk hook's binary, or the caveman plugin.
    static func theirs(_ kind: Kind) -> String? {
        guard let json = readSettings() else { return nil }
        switch kind {
        case .rtk:
            let pre = (json["hooks"] as? [String: Any])?["PreToolUse"] as? [[String: Any]] ?? []
            for entry in pre {
                for hook in entry["hooks"] as? [[String: Any]] ?? [] {
                    guard let cmd = hook["command"] as? String, cmd.contains("rtk"), cmd.contains(" hook "), !cmd.contains(guardMark) else { continue }
                    return String(cmd.split(separator: " ").first ?? "")
                }
            }
            return nil
        case .caveman:
            let plugins = json["enabledPlugins"] as? [String: Any] ?? [:]
            return plugins.first { $0.key.hasPrefix("caveman@") && $0.value as? Bool == true }?.key
        }
    }

    // MARK: rtk

    /// The app's rtk. rtk's hook rewrites `git status` into `rtk git status` and its own hook command is a plain `rtk`,
    /// so it has to be on the PATH: the app's terminals have this folder on theirs (TerminalFactory.childEnvironmentDict),
    /// and ~/.local/bin, on the PATH wherever Claude Code's own installer put `claude`, gets a link to it unless an rtk is
    /// there already. Where it's on neither, the hook does nothing at all (guarded), and commands run as they are.
    static let binDir = support.appendingPathComponent("bin")
    private static let ourRtk = binDir.appendingPathComponent("rtk")
    private static let localLink = URL(fileURLWithPath: HOME + "/.local/bin/rtk")
    private static let guardMark = "atalay-terminal-rtk"
    private static func guarded(_ tool: String) -> String {
        "sh -c 'command -v rtk >/dev/null 2>&1 && exec rtk hook \(tool); cat >/dev/null' \(guardMark)"
    }
    private static var bundledRtk: URL? {
        Bundle.main.resourceURL.map { $0.appendingPathComponent("bin/rtk") }.flatMap { FileManager.default.isExecutableFile(atPath: $0.path) ? $0 : nil }
    }

    private static func installRtk() {
        guard let src = bundledRtk else { return }
        let fm = FileManager.default
        try? fm.createDirectory(at: ourRtk.deletingLastPathComponent(), withIntermediateDirectories: true)
        if fm.contentsEqual(atPath: src.path, andPath: ourRtk.path) == false {
            try? fm.removeItem(at: ourRtk)
            try? fm.copyItem(at: src, to: ourRtk)
        }
        // A downloaded app's files are quarantined; this one is the app's own and runs from Claude's hook.
        removexattr(ourRtk.path, "com.apple.quarantine", 0)
        run(["init", "-g", "--auto-patch"])
        if codex { run(["init", "-g", "--codex"]) }
        if (try? fm.destinationOfSymbolicLink(atPath: localLink.path)) == nil, !fm.fileExists(atPath: localLink.path) {
            try? fm.createDirectory(at: localLink.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? fm.createSymbolicLink(at: localLink, withDestinationURL: ourRtk)
        }
        rewriteRtkHooks(guarding: true)
    }

    private static func uninstallRtk() {
        guard FileManager.default.isExecutableFile(atPath: ourRtk.path) else { return }
        // rtk takes out the hooks it knows, the plain ones.
        rewriteRtkHooks(guarding: false)
        run(["init", "-g", "--uninstall"])
        if codex { run(["init", "-g", "--codex", "--uninstall"]) }
        if (try? FileManager.default.destinationOfSymbolicLink(atPath: localLink.path)) == ourRtk.path {
            try? FileManager.default.removeItem(at: localLink)
        }
    }

    /// rtk's hooks in Claude Code's settings and Codex's hooks.json, guarded (`guarding`) or plain again.
    private static func rewriteRtkHooks(guarding: Bool) {
        let swap = { (hooks: inout [String: Any], tool: String) in
            let plain = "rtk hook " + tool, safe = guarded(tool)
            rewrite(&hooks, from: guarding ? plain : safe, to: guarding ? safe : plain)
        }
        editSettings { swap(&$0, "claude") }
        let file = HOME + "/.codex/hooks.json"
        guard var json = FileManager.default.contents(atPath: file).flatMap({ try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }),
              var hooks = json["hooks"] as? [String: Any] else { return }
        swap(&hooks, "codex")
        json["hooks"] = hooks
        if let out = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) {
            try? out.write(to: URL(fileURLWithPath: file), options: .atomic)
        }
    }

    /// Every hook command `from` in every event becomes `to`.
    private static func rewrite(_ hooks: inout [String: Any], from: String, to: String) {
        for (event, value) in hooks {
            guard let list = value as? [[String: Any]] else { continue }
            hooks[event] = list.map { entry in
                var e = entry
                e["hooks"] = (e["hooks"] as? [[String: Any]] ?? []).map { hook in
                    var h = hook
                    if h["command"] as? String == from { h["command"] = to }
                    return h
                }
                return e
            }
        }
    }

    @discardableResult
    private static func run(_ args: [String], bin: String? = nil) -> Data {
        let p = Process(), out = Pipe()
        p.executableURL = URL(fileURLWithPath: bin ?? ourRtk.path)
        p.arguments = args
        p.standardInput = FileHandle.nullDevice
        p.standardOutput = out
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return Data() }
        let data = out.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        return data
    }

    // MARK: caveman

    private static let ourCaveman = support.appendingPathComponent("caveman")
    private static var bundledCaveman: URL? {
        Bundle.main.resourceURL.map { $0.appendingPathComponent("caveman") }
            .flatMap { FileManager.default.fileExists(atPath: $0.appendingPathComponent("rules.md").path) ? $0 : nil }
    }
    /// What marks the app's caveman hooks and Codex notes, so they come out again and nothing else does.
    private static let mark = "atalay-terminal/caveman/"
    private static let codexStart = "<!-- atalay-terminal: caveman -->", codexEnd = "<!-- /atalay-terminal: caveman -->"

    private static func installCaveman() {
        guard let src = bundledCaveman else { return }
        let fm = FileManager.default
        try? fm.createDirectory(at: ourCaveman, withIntermediateDirectories: true)
        for name in ["rules.md", "remind.json", "LICENSE"] {
            let to = ourCaveman.appendingPathComponent(name)
            try? fm.removeItem(at: to)
            try? fm.copyItem(at: src.appendingPathComponent(name), to: to)
        }
        let rules = ourCaveman.appendingPathComponent("rules.md").path, remind = ourCaveman.appendingPathComponent("remind.json").path
        editSettings { hooks in
            add(&hooks, "SessionStart", command: "cat " + shellQuote(rules))
            add(&hooks, "UserPromptSubmit", command: "cat " + shellQuote(remind))
        }
        if codex, let text = try? String(contentsOfFile: rules, encoding: .utf8) {
            let block = "\(codexStart)\n\(text.trimmingCharacters(in: .whitespacesAndNewlines))\n\(codexEnd)\n"
            editCodexNotes { notes in notes + "\n" + block }
        }
    }

    private static func uninstallCaveman() {
        editSettings { hooks in
            for event in ["SessionStart", "UserPromptSubmit"] { remove(&hooks, event) }
        }
        editCodexNotes { $0 }
        try? FileManager.default.removeItem(at: ourCaveman)
    }

    private static func add(_ hooks: inout [String: Any], _ event: String, command: String) {
        remove(&hooks, event)
        var list = hooks[event] as? [[String: Any]] ?? []
        list.append(["hooks": [["type": "command", "command": command, "timeout": 5]]])
        hooks[event] = list
    }

    /// Takes the app's caveman hook out of an event, and the entry with it when nothing else is left in it.
    private static func remove(_ hooks: inout [String: Any], _ event: String) {
        guard var list = hooks[event] as? [[String: Any]] else { return }
        list = list.compactMap { entry in
            var e = entry
            let kept = (e["hooks"] as? [[String: Any]] ?? []).filter { ($0["command"] as? String)?.contains(mark) != true }
            if kept.isEmpty { return nil }
            e["hooks"] = kept
            return e
        }
        hooks[event] = list.isEmpty ? nil : list
    }

    private static func readSettings() -> [String: Any]? {
        FileManager.default.contents(atPath: settingsFile).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }

    /// Claude Code's settings with their hooks changed, the rest as they were.
    private static func editSettings(_ change: (inout [String: Any]) -> Void) {
        var settings = readSettings() ?? [:]
        var hooks = settings["hooks"] as? [String: Any] ?? [:]
        change(&hooks)
        settings["hooks"] = hooks.isEmpty ? nil : hooks
        guard let out = try? JSONSerialization.data(withJSONObject: settings, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        else { return }
        try? FileManager.default.createDirectory(atPath: CLAUDE_DIR, withIntermediateDirectories: true)
        try? out.write(to: URL(fileURLWithPath: settingsFile), options: .atomic)
    }

    /// Codex's AGENTS.md without the app's caveman notes, then `change` (which may put them back).
    private static func editCodexNotes(_ change: (String) -> String) {
        let file = HOME + "/.codex/AGENTS.md"
        let old = (try? String(contentsOfFile: file, encoding: .utf8)) ?? ""
        var text = old
        // The notes go with the line break put before them and the one after.
        if let a = text.range(of: codexStart), let b = text.range(of: codexEnd, range: a.upperBound..<text.endIndex) {
            var lo = a.lowerBound, hi = b.upperBound
            if lo > text.startIndex, text[text.index(before: lo)] == "\n" { lo = text.index(before: lo) }
            if hi < text.endIndex, text[hi] == "\n" { hi = text.index(after: hi) }
            text.removeSubrange(lo..<hi)
        }
        let next = change(text)
        guard next != old else { return }
        // A file only the app's notes were in goes with them.
        if next.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { try? FileManager.default.removeItem(atPath: file); return }
        try? next.write(toFile: file, atomically: true, encoding: .utf8)
    }

    private static func shellQuote(_ s: String) -> String { "'" + s.replacingOccurrences(of: "'", with: "'\\''") + "'" }

    // MARK: Settings

    /// For Settings: each saver's state, and what rtk saved so far (its `gain`).
    static func state() -> [String: Any] {
        var out: [String: Any] = [:]
        for kind in Kind.allCases {
            let theirs = theirs(kind)
            let on = theirs != nil || UserDefaults.standard.bool(forKey: key(kind))
            var s: [String: Any] = ["available": available(kind), "on": on, "theirs": theirs != nil]
            if kind == .rtk, on {
                let bin = theirs ?? (FileManager.default.isExecutableFile(atPath: ourRtk.path) ? ourRtk.path : nil)
                if let bin, let j = try? JSONSerialization.jsonObject(with: run(["gain", "--format", "json"], bin: bin)) as? [String: Any],
                   let sum = j["summary"] as? [String: Any] {
                    s["saved"] = sum["total_saved"]
                    s["pct"] = sum["avg_savings_pct"]
                    s["commands"] = sum["total_commands"]
                }
            }
            out[kind.rawValue] = s
        }
        return out
    }
}

/// Settings' token saver requests (web/cloud.js): their state with what rtk saved, and the switches.
final class SaversBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let answer: @Sendable () -> Void = {
            DispatchQueue.global(qos: .utility).async {
                let s = TokenSavers.state()
                DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(s, nil) } }
            }
        }
        switch body["type"] as? String {
        case "state": answer()
        case "set":
            guard let kind = TokenSavers.Kind(rawValue: body["which"] as? String ?? "") else { return replyHandler(nil, "unknown saver") }
            TokenSavers.set(kind, body["on"] as? Bool == true) { answer() }
        default: replyHandler(nil, "unknown request")
        }
    }
}
