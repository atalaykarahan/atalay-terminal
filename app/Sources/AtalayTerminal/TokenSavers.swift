import AppKit
import WebKit

/// The token savers for the AI tools on this Mac, both shipped in the app and on from its first launch that has them,
/// without asking; Settings turns each off (and on again).
/// - rtk (github.com/rtk-ai/rtk, Apache-2.0) shortens what commands print before Claude Code, Codex or Antigravity
///   reads it: the app's copy goes to Application Support (a path that outlives the app's updates) and sets itself up as
///   `rtk init` does, a hook in Claude Code, its notes and hook in Codex, and its plugin in Antigravity. Off: `rtk init
///   --uninstall`.
/// - caveman (github.com/JuliusBrussee/caveman, MIT) makes Claude Code, Codex and Antigravity answer tersely: its rules
///   at the start of every session and a one-line reminder with every prompt (two hooks in Claude Code's settings that
///   print the app's copies, no Node needed), the rules in Codex's AGENTS.md, and a plugin in Antigravity. Off: the
///   hooks, the rules and the plugin go.
/// One the user set up themselves (their own rtk hook, the caveman plugin or the hooks its installer wires) takes the
/// app's place and switches the same way: off takes it out of the tools' settings and keeps it, on puts it back as it
/// was. The app keeps it current too: an rtk older than the app's is replaced by it where it lies (rtk has no updater;
/// one Homebrew keeps is Homebrew's), and Claude Code updates the caveman plugin by itself (auto-update on for its
/// marketplace, as /plugin's "Enable auto-update" does).
enum TokenSavers {
    enum Kind: String, CaseIterable { case rtk, caveman }

    /// Every change to the tools' settings, one at a time.
    static let queue = DispatchQueue(label: "token-savers", qos: .utility)
    private static let support = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal")
    private static var codex: Bool { FileManager.default.fileExists(atPath: HOME + "/.codex") }
    private static var agy: Bool {
        ["antigravity-cli", "antigravity", "antigravity-ide"].contains {
            FileManager.default.fileExists(atPath: HOME + "/.gemini/" + $0)
        }
    }
    private static var settingsFile: String { CLAUDE_DIR + "/settings.json" }
    private static var codexHooks: String { HOME + "/.codex/hooks.json" }
    private static var agyConfig: String { HOME + "/.gemini/config/config.json" }
    private static var agyPlugins: String { HOME + "/.gemini/config/plugins" }
    private static var agyRtkHooks: String { agyPlugins + "/rtk/hooks.json" }
    private static var agyCaveman: URL { URL(fileURLWithPath: agyPlugins + "/caveman") }

    /// What the user decided for each, and what of their own the app took out when they turned it off: one file that
    /// every build of the app shares (the staging one sets up the same Claude Code). Before it, the decision was a default.
    private static let decisions = support.appendingPathComponent("token-savers.json")
    private static func legacyKey(_ kind: Kind) -> String { kind == .rtk ? "tokenSavers" : "tokenSaverCaveman" }

    private static func record(_ kind: Kind) -> [String: Any] {
        readJSON(decisions.path)?[kind.rawValue] as? [String: Any] ?? [:]
    }

    private static func save(_ kind: Kind, _ rec: [String: Any]) {
        var all = readJSON(decisions.path) ?? [:]
        all[kind.rawValue] = rec
        guard let out = try? JSONSerialization.data(withJSONObject: all, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        else { return }
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        try? out.write(to: decisions, options: .atomic)
    }

    /// On or off as the user left it; nil: not decided yet (the first launch that has it turns it on).
    private static func decided(_ kind: Kind) -> Bool? {
        record(kind)["on"] as? Bool ?? UserDefaults.standard.object(forKey: legacyKey(kind)) as? Bool
    }

    /// At a launch: each saver on unless the user turned it off. The user's own is kept current, and the app's goes
    /// out of its way (both would run).
    static func autoStart() {
        queue.async {
            for kind in Kind.allCases where available(kind) {
                if let theirs = theirs(kind) {
                    keepCurrent(kind, theirs)
                    if installed(kind) { removeOurs(kind) }
                } else if decided(kind) != false, !synced(kind) {
                    turn(kind, true)
                }
            }
        }
    }

    static func available(_ kind: Kind) -> Bool {
        if theirs(kind) != nil || record(kind)["kept"] != nil { return true }
        switch kind {
        case .rtk: return bundledRtk != nil
        case .caveman: return bundledCaveman != nil
        }
    }

    /// Settings' switches.
    static func set(_ kind: Kind, _ on: Bool, done: (@MainActor () -> Void)? = nil) {
        queue.async {
            turn(kind, on)
            DispatchQueue.main.async { MainActor.assumeIsolated { done?() } }
        }
    }

    private static func turn(_ kind: Kind, _ on: Bool) {
        var rec = record(kind)
        rec["on"] = on
        if on {
            // The user's own goes back as it was; without one, the app's.
            if let kept = rec["kept"] as? [String: Any] {
                putBack(kept)
                rec["kept"] = nil
            }
            if let theirs = theirs(kind) { keepCurrent(kind, theirs) } else if !synced(kind) { install(kind) }
        } else if theirs(kind) != nil {
            rec["kept"] = takeOut(kind)
            if installed(kind) { removeOurs(kind) }
        } else if installed(kind) {
            if kind == .rtk, !ourAgyRtk, setAgyPlugin("rtk", false) {
                rec["kept"] = ["agyPlugin": "rtk"]
            } else if kind == .caveman, !ourAgyCaveman, setAgyPlugin("caveman", false) {
                rec["kept"] = ["agyPlugin": "caveman"]
            }
            uninstall(kind)
        }
        save(kind, rec)
    }

    /// What one the user set up themselves runs: their rtk hook's binary, the caveman plugin, or "hooks" for the hooks
    /// caveman's installer wires into Claude Code's settings where its plugin wouldn't install.
    static func theirs(_ kind: Kind) -> String? {
        switch kind {
        case .rtk:
            if let own = commands(settingsFile).first(where: isRtkHook) {
                return String(own.split(separator: " ").first ?? "")
            }
            guard !commands(settingsFile).contains(where: { $0.contains(guardMark) }) else { return nil }
            let other = commands(codexHooks) + commands(agyRtkHooks, key: "rtk-rewrite")
            return other.first(where: isRtkHook).map { String($0.split(separator: " ").first ?? "") }
        case .caveman:
            let plugins = readJSON(settingsFile)?["enabledPlugins"] as? [String: Any] ?? [:]
            if let plugin = plugins.first(where: { $0.key.hasPrefix("caveman@") && $0.value as? Bool == true })?.key { return plugin }
            return commands(settingsFile).contains(where: isTheirCaveman) ? "hooks" : nil
        }
    }

    /// Whether the app's own is set up: its hook in Claude Code's settings, Codex's hooks or Antigravity's plugins.
    private static func installed(_ kind: Kind) -> Bool {
        switch kind {
        case .rtk:
            return commands(settingsFile).contains { $0.contains(guardMark) }
                || commands(codexHooks).contains { $0.contains(guardMark) }
                || (ourAgyRtk && agyPluginEnabled("rtk"))
                || (theirs(.rtk) == nil && agyPluginEnabled("rtk"))
        case .caveman:
            return commands(settingsFile).contains { $0.contains(mark) }
                || ((try? String(contentsOfFile: HOME + "/.codex/AGENTS.md", encoding: .utf8))?.contains(codexStart) == true)
                || (ourAgyCaveman && agyPluginEnabled("caveman"))
                || (theirs(.caveman) == nil && agyPluginEnabled("caveman"))
        }
    }

    /// Whether the app's copy and every installed tool's hook/plugin are current (a tool installed later gets it too).
    private static func synced(_ kind: Kind) -> Bool {
        guard commands(settingsFile).contains(where: { $0.contains(kind == .rtk ? guardMark : mark) }) else { return false }
        let fm = FileManager.default
        switch kind {
        case .rtk:
            if let src = bundledRtk, !fm.contentsEqual(atPath: src.path, andPath: ourRtk.path) { return false }
            if codex, !commands(codexHooks).contains(where: { $0.contains(guardMark) }) { return false }
            if agy, (!ourAgyRtk && !fm.fileExists(atPath: agyPlugins + "/rtk/plugin.json")) || !agyPluginEnabled("rtk") { return false }
            return true
        case .caveman:
            if let src = bundledCaveman,
               !fm.contentsEqual(atPath: src.appendingPathComponent("rules.md").path, andPath: ourCaveman.appendingPathComponent("rules.md").path) {
                return false
            }
            if codex, ((try? String(contentsOfFile: HOME + "/.codex/AGENTS.md", encoding: .utf8))?.contains(codexStart) != true) { return false }
            if agy, !fm.fileExists(atPath: agyCaveman.path) || !agyPluginEnabled("caveman") { return false }
            return true
        }
    }

    private static func install(_ kind: Kind) {
        switch kind {
        case .rtk: installRtk()
        case .caveman: installCaveman()
        }
    }

    private static func uninstall(_ kind: Kind) {
        switch kind {
        case .rtk: uninstallRtk()
        case .caveman: uninstallCaveman()
        }
    }

    /// The app's own, beside the user's: only what is the app's goes (rtk's own uninstall would take the user's RTK.md
    /// along).
    private static func removeOurs(_ kind: Kind) {
        switch kind {
        case .rtk:
            for file in [settingsFile, codexHooks] { _ = takeOutHooks(file) { $0.contains(guardMark) } }
            if ourAgyRtk {
                try? FileManager.default.removeItem(atPath: agyPlugins + "/rtk")
            }
            if (try? FileManager.default.destinationOfSymbolicLink(atPath: localLink.path)) == ourRtk.path {
                try? FileManager.default.removeItem(at: localLink)
            }
        case .caveman:
            uninstallCaveman()
        }
    }

    // MARK: The user's own

    /// `rtk hook claude` (with or without its path) or the rewrite script older rtks set up; not the app's.
    private static func isRtkHook(_ cmd: String) -> Bool {
        guard !cmd.contains(guardMark) else { return false }
        if cmd.contains("rtk-rewrite.sh") { return true }
        let words = cmd.split(separator: " ")
        return words.count >= 2 && (String(words[0]) as NSString).lastPathComponent == "rtk" && words[1] == "hook"
    }

    private static func isTheirCaveman(_ cmd: String) -> Bool { cmd.contains("caveman") && !cmd.contains(mark) }

    private static func agyPluginEnabled(_ name: String) -> Bool {
        guard FileManager.default.fileExists(atPath: agyPlugins + "/" + name + "/plugin.json") else { return false }
        let plugins = readJSON(agyConfig)?["plugins"] as? [String: Any]
        let entry = plugins?[name] as? [String: Any]
        return entry?["enabled"] as? Bool != false
    }

    @discardableResult
    private static func setAgyPlugin(_ name: String, _ on: Bool) -> Bool {
        guard FileManager.default.fileExists(atPath: agyPlugins + "/" + name + "/plugin.json") else { return false }
        var changed = false
        editJSON(agyConfig, create: true) { json in
            var plugins = json["plugins"] as? [String: Any] ?? [:]
            var entry = plugins[name] as? [String: Any] ?? [:]
            guard (entry["enabled"] as? Bool ?? true) != on else { return false }
            entry["enabled"] = on
            plugins[name] = entry
            json["plugins"] = plugins
            changed = true
            return true
        }
        return changed
    }

    /// The user's own out of the tools' settings, and what it takes to put it back: their rtk hooks (Claude Code's,
    /// Codex's and Antigravity's), the caveman plugin turned off as `claude plugin disable` leaves it, or its installer's hooks.
    private static func takeOut(_ kind: Kind) -> [String: Any] {
        switch kind {
        case .rtk:
            var out: [String: Any] = ["hooks": takeOutHooks(settingsFile, isRtkHook)
                + takeOutHooks(codexHooks, isRtkHook)
                + takeOutHooks(agyRtkHooks, key: "rtk-rewrite", isRtkHook)]
            if setAgyPlugin("rtk", false) { out["agyPlugin"] = "rtk" }
            return out
        case .caveman:
            var plugins: [String] = []
            editJSON(settingsFile) { json in
                var enabled = json["enabledPlugins"] as? [String: Any] ?? [:]
                plugins = enabled.filter { $0.key.hasPrefix("caveman@") && $0.value as? Bool == true }.map(\.key)
                for plugin in plugins { enabled[plugin] = false }
                json["enabledPlugins"] = enabled
                return !plugins.isEmpty
            }
            var out: [String: Any] = ["plugins": plugins, "hooks": takeOutHooks(settingsFile, isTheirCaveman)]
            if !ourAgyCaveman, setAgyPlugin("caveman", false) { out["agyPlugin"] = "caveman" }
            return out
        }
    }

    private static func putBack(_ kept: [String: Any]) {
        if let agyPlugin = kept["agyPlugin"] as? String {
            setAgyPlugin(agyPlugin, true)
        }
        if let plugins = kept["plugins"] as? [String], !plugins.isEmpty {
            editJSON(settingsFile) { json in
                var enabled = json["enabledPlugins"] as? [String: Any] ?? [:]
                for plugin in plugins { enabled[plugin] = true }
                json["enabledPlugins"] = enabled
                return true
            }
        }
        let hooks = kept["hooks"] as? [[String: Any]] ?? []
        for (file, taken) in Dictionary(grouping: hooks, by: { $0["file"] as? String ?? "" }) where !file.isEmpty {
            editJSON(file, create: true) { json in
                for r in taken {
                    let key = r["key"] as? String ?? "hooks"
                    var all = json[key] as? [String: Any] ?? [:]
                    guard let event = r["event"] as? String, let hook = r["hook"] as? [String: Any], let cmd = hook["command"] as? String
                    else { continue }
                    var entries = all[event] as? [[String: Any]] ?? []
                    // Set up again by the user meanwhile: not twice.
                    guard !entries.contains(where: { ($0["hooks"] as? [[String: Any]] ?? []).contains { $0["command"] as? String == cmd } })
                    else { continue }
                    var entry: [String: Any] = ["hooks": [hook]]
                    entry["matcher"] = r["matcher"]
                    entries.append(entry)
                    all[event] = entries
                    json[key] = all
                }
                return true
            }
        }
    }

    /// Takes the hooks `match` picks out of a settings file (Claude Code's, Codex's hooks.json or Antigravity's
    /// hooks.json, laid out alike under `key`), an entry left with none going too, and returns each with where it was.
    private static func takeOutHooks(_ file: String, key: String = "hooks", _ match: (String) -> Bool) -> [[String: Any]] {
        var taken: [[String: Any]] = []
        editJSON(file) { json in
            guard var hooks = json[key] as? [String: Any] else { return false }
            for (event, value) in hooks {
                guard let list = value as? [[String: Any]] else { continue }
                let left = list.compactMap { entry -> [String: Any]? in
                    var e = entry
                    let all = e["hooks"] as? [[String: Any]] ?? []
                    let picked = all.filter { match($0["command"] as? String ?? "") }
                    guard !picked.isEmpty else { return e }
                    for hook in picked {
                        var r: [String: Any] = ["file": file, "key": key, "event": event, "hook": hook]
                        r["matcher"] = e["matcher"]
                        taken.append(r)
                    }
                    let rest = all.filter { !match($0["command"] as? String ?? "") }
                    if rest.isEmpty { return nil }
                    e["hooks"] = rest
                    return e
                }
                hooks[event] = left.isEmpty ? nil : left
            }
            json[key] = hooks.isEmpty ? nil : hooks
            return !taken.isEmpty
        }
        return taken
    }

    /// The user's own, current.
    private static func keepCurrent(_ kind: Kind, _ theirs: String) {
        switch kind {
        case .rtk:
            if let bin = rtkBinary(theirs) { refresh(rtk: bin) }
        case .caveman:
            if theirs.contains("@"), let marketplace = theirs.split(separator: "@").last { autoUpdate(marketplace: String(marketplace)) }
        }
    }

    /// The rtk binary a user's hook runs: its path, or for a plain `rtk` the first of the places installers put it
    /// (rtk's own installer: ~/.local/bin).
    private static func rtkBinary(_ bin: String) -> String? {
        let path = (bin as NSString).expandingTildeInPath
        guard (path as NSString).lastPathComponent == "rtk" else { return nil }
        let places = path.hasPrefix("/") ? [path]
            : [HOME + "/.local/bin", HOME + "/.cargo/bin", "/opt/homebrew/bin", "/usr/local/bin"].map { $0 + "/rtk" }
        return places.first { FileManager.default.isExecutableFile(atPath: $0) }
    }

    /// An rtk older than the app's, replaced by the app's where it lies, as rtk's installer updates it. A link (Homebrew's,
    /// or the app's own) is left alone.
    private static func refresh(rtk path: String) {
        let fm = FileManager.default
        guard let src = bundledRtk, (try? fm.attributesOfItem(atPath: path))?[.type] as? FileAttributeType == .typeRegular,
              !path.contains("/Cellar/"), fm.isWritableFile(atPath: (path as NSString).deletingLastPathComponent),
              let theirs = rtkVersion(path), let ours = rtkVersion(src.path), theirs.lexicographicallyPrecedes(ours)
        else { return }
        let next = path + ".atalay-terminal"
        try? fm.removeItem(atPath: next)
        guard (try? fm.copyItem(atPath: src.path, toPath: next)) != nil else { return }
        chmod(next, 0o755)
        removexattr(next, "com.apple.quarantine", 0)
        // In one step: a hook running now finishes on the old one.
        if rename(next, path) != 0 { try? fm.removeItem(atPath: next) }
    }

    /// `rtk --version`'s numbers ("rtk 1.1.0").
    private static func rtkVersion(_ bin: String) -> [Int]? {
        let text = String(decoding: run(["--version"], bin: bin), as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
        guard text.hasPrefix("rtk "), let number = text.split(separator: " ").last else { return nil }
        let parts = number.split(separator: ".").map { Int($0.prefix { $0.isNumber }) }
        guard !parts.isEmpty, !parts.contains(nil) else { return nil }
        return parts.compactMap { $0 }
    }

    /// Claude Code updates a plugin by itself only from a marketplace with auto-update on: Anthropic's own by default,
    /// the rest once /plugin's "Enable auto-update" is chosen. This turns it on for the caveman plugin's, in the user's
    /// settings, where that switch writes it too. One the user turned off stays off.
    private static func autoUpdate(marketplace name: String) {
        let known = readJSON(CLAUDE_DIR + "/plugins/known_marketplaces.json")?[name] as? [String: Any]
        guard known?["autoUpdate"] == nil else { return }
        editJSON(settingsFile) { json in
            guard json["extraKnownMarketplaces"] == nil || json["extraKnownMarketplaces"] is [String: Any] else { return false }
            var all = json["extraKnownMarketplaces"] as? [String: Any] ?? [:]
            var entry = all[name] as? [String: Any] ?? [:]
            if entry["source"] == nil {
                // Recorded only by Claude Code (an older install): declared here too, from the same source.
                guard let source = known?["source"] else { return false }
                entry["source"] = source
            }
            guard entry["autoUpdate"] == nil else { return false }
            entry["autoUpdate"] = true
            all[name] = entry
            json["extraKnownMarketplaces"] = all
            return true
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
    private static var ourAgyRtk: Bool {
        commands(agyRtkHooks, key: "rtk-rewrite").contains { $0.contains(guardMark) }
    }
    private static func guarded(_ tool: String) -> String {
        let fallback = tool == "antigravity" ? "; printf \"%s\\n\" \"{\\\"decision\\\":\\\"allow\\\"}\"" : ""
        return "sh -c 'command -v rtk >/dev/null 2>&1 && exec rtk hook \(tool); cat >/dev/null\(fallback)' \(guardMark)"
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
        // rtk knows its hook only as it writes it: plain while it looks, or it puts a second one in.
        rewriteRtkHooks(guarding: false)
        run(["init", "-g", "--auto-patch"])
        if codex { run(["init", "-g", "--codex"]) }
        if agy {
            if !fm.fileExists(atPath: agyPlugins + "/rtk/plugin.json") || ourAgyRtk {
                run(["init", "-g", "--agent", "antigravity"])
            }
            setAgyPlugin("rtk", true)
        }
        if (try? fm.destinationOfSymbolicLink(atPath: localLink.path)) == nil, !fm.fileExists(atPath: localLink.path) {
            try? fm.createDirectory(at: localLink.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? fm.createSymbolicLink(at: localLink, withDestinationURL: ourRtk)
        }
        rewriteRtkHooks(guarding: true)
    }

    private static func uninstallRtk() {
        guard FileManager.default.isExecutableFile(atPath: ourRtk.path) else { return removeOurs(.rtk) }
        let hadOurAgy = ourAgyRtk
        // rtk takes out the hooks it knows, the plain ones.
        rewriteRtkHooks(guarding: false)
        run(["init", "-g", "--uninstall"])
        if codex { run(["init", "-g", "--codex", "--uninstall"]) }
        if hadOurAgy {
            run(["init", "-g", "--agent", "antigravity", "--uninstall"])
        }
        if (try? FileManager.default.destinationOfSymbolicLink(atPath: localLink.path)) == ourRtk.path {
            try? FileManager.default.removeItem(at: localLink)
        }
    }

    /// rtk's hooks in Claude Code's settings, Codex's hooks.json and Antigravity's rtk plugin, guarded (`guarding`) or plain again.
    private static func rewriteRtkHooks(guarding: Bool) {
        let swap = { (hooks: inout [String: Any], tool: String) in
            let plain = "rtk hook " + tool, safe = guarded(tool)
            rewrite(&hooks, from: guarding ? plain : safe, to: guarding ? safe : plain)
        }
        editSettings { swap(&$0, "claude") }
        for (file, key, tool) in [(codexHooks, "hooks", "codex"), (agyRtkHooks, "rtk-rewrite", "antigravity")] {
            editJSON(file) { json in
                guard var hooks = json[key] as? [String: Any] else { return false }
                swap(&hooks, tool)
                json[key] = hooks
                return true
            }
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
    private static var ourAgyCaveman: Bool {
        let hooks = readJSON(agyCaveman.appendingPathComponent("hooks.json").path)?["caveman"] as? [String: Any]
        let list = hooks?["PreInvocation"] as? [[String: Any]] ?? []
        return list.contains { ($0["command"] as? String)?.contains(mark) == true }
    }

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
        let text = (try? String(contentsOfFile: rules, encoding: .utf8))?.trimmingCharacters(in: .whitespacesAndNewlines)
        if codex, let text {
            let block = "\(codexStart)\n\(text)\n\(codexEnd)\n"
            editCodexNotes { notes in notes + "\n" + block }
        }
        if agy, let text {
            installAgyCaveman(rules: text, remind: remind)
        }
    }

    /// Antigravity's caveman plugin: its rules at the start of every session, its skill, and the one-line reminder before
    /// every prompt (`PreInvocation`). One the user installed themselves stays theirs.
    private static func installAgyCaveman(rules: String, remind: String) {
        let fm = FileManager.default
        if fm.fileExists(atPath: agyCaveman.path), !ourAgyCaveman {
            setAgyPlugin("caveman", true)
            return
        }
        let agyRemind = ourCaveman.appendingPathComponent("agy-remind.json")
        if let prompt = (readJSON(remind)?["hookSpecificOutput"] as? [String: Any])?["additionalContext"] as? String,
           let data = try? JSONSerialization.data(withJSONObject: ["injectSteps": [["ephemeralMessage": prompt]]], options: [.withoutEscapingSlashes]) {
            try? data.write(to: agyRemind, options: .atomic)
        }
        let rulesDir = agyCaveman.appendingPathComponent("rules")
        let skillDir = agyCaveman.appendingPathComponent("skills/caveman")
        try? fm.createDirectory(at: rulesDir, withIntermediateDirectories: true)
        try? fm.createDirectory(at: skillDir, withIntermediateDirectories: true)
        let desc = "Terse caveman responses that cut output tokens while keeping full technical accuracy."
        if let manifest = try? JSONSerialization.data(
            withJSONObject: [
                "name": "caveman",
                "version": "1.0.0",
                "description": desc,
                "repository": "https://github.com/JuliusBrussee/caveman"
            ],
            options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        ) {
            try? manifest.write(to: agyCaveman.appendingPathComponent("plugin.json"), options: .atomic)
        }
        let block = "\(codexStart)\n\(rules)\n\(codexEnd)\n"
        try? block.write(to: rulesDir.appendingPathComponent("AGENTS.md"), atomically: true, encoding: .utf8)
        let skill = "---\nname: caveman\ndescription: \(desc)\n---\n\n\(rules)\n"
        try? skill.write(to: skillDir.appendingPathComponent("SKILL.md"), atomically: true, encoding: .utf8)
        let hooks: [String: Any] = [
            "caveman": [
                "PreInvocation": [
                    ["type": "command", "command": "cat " + shellQuote(agyRemind.path), "timeout": 5]
                ]
            ]
        ]
        if let data = try? JSONSerialization.data(withJSONObject: hooks, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]) {
            try? data.write(to: agyCaveman.appendingPathComponent("hooks.json"), options: .atomic)
        }
        setAgyPlugin("caveman", true)
    }

    private static func uninstallCaveman() {
        editSettings { hooks in
            for event in ["SessionStart", "UserPromptSubmit"] { remove(&hooks, event) }
        }
        editCodexNotes { $0 }
        if ourAgyCaveman { try? FileManager.default.removeItem(at: agyCaveman) }
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

    // MARK: Settings files

    private static func readJSON(_ file: String) -> [String: Any]? {
        FileManager.default.contents(atPath: file).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
    }

    /// Every hook command in a settings file (Claude Code's, Codex's hooks.json or Antigravity's hooks.json under `key`).
    private static func commands(_ file: String, key: String = "hooks") -> [String] {
        let hooks = readJSON(file)?[key] as? [String: Any] ?? [:]
        return hooks.values.flatMap { list in
            (list as? [[String: Any]] ?? []).flatMap { ($0["hooks"] as? [[String: Any]] ?? []).compactMap { $0["command"] as? String } }
        }
    }

    /// A JSON settings file as `change` leaves it, written only when it says it changed something. One that doesn't
    /// read as JSON stays as it is (written over, the user's settings would be lost); a missing one is made only with
    /// `create`. A link is followed: the file it points to changes.
    private static func editJSON(_ file: String, create: Bool = false, _ change: (inout [String: Any]) -> Bool) {
        let url = URL(fileURLWithPath: file).resolvingSymlinksInPath()
        var json: [String: Any] = [:]
        if let data = FileManager.default.contents(atPath: url.path) {
            if !String(decoding: data, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                guard let read = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
                json = read
            }
        } else if !create {
            return
        }
        guard change(&json),
              let out = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
        else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? out.write(to: url, options: .atomic)
    }

    /// Claude Code's settings with their hooks changed, the rest as they were.
    private static func editSettings(_ change: (inout [String: Any]) -> Void) {
        editJSON(settingsFile, create: true) { settings in
            var hooks = settings["hooks"] as? [String: Any] ?? [:]
            change(&hooks)
            settings["hooks"] = hooks.isEmpty ? nil : hooks
            return true
        }
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
            let on = theirs != nil || installed(kind)
            var s: [String: Any] = ["available": available(kind), "on": on]
            if kind == .rtk, on {
                let bin = theirs.flatMap(rtkBinary) ?? (FileManager.default.isExecutableFile(atPath: ourRtk.path) ? ourRtk.path : nil)
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
            TokenSavers.queue.async {
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
