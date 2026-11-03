import AppKit
import WebKit

/// The token saver for the AI tools on this Mac: rtk (github.com/rtk-ai/rtk, Apache-2.0, shipped in the app), which
/// shortens what commands print before Claude Code or Codex reads it. Asked about once, at the first launch that has it;
/// the dashboard's Settings turns it on and off. On: the app's copy goes to Application Support (a path that outlives the
/// app's updates) and rtk sets itself up as `rtk init` does, a hook in Claude Code and its notes in Codex's AGENTS.md.
/// Off: `rtk init --uninstall`. An rtk the user set up themselves is theirs: the app leaves it alone and only shows what
/// it saved.
enum TokenSavers {
    private static let key = "tokenSavers" // on or off; missing: not asked yet
    private static let ours = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
        ?? URL(fileURLWithPath: HOME + "/Library/Application Support")).appendingPathComponent("atalay-terminal/bin/rtk")
    private static var bundled: URL? {
        Bundle.main.resourceURL.map { $0.appendingPathComponent("bin/rtk") }.flatMap { FileManager.default.isExecutableFile(atPath: $0.path) ? $0 : nil }
    }
    private static var codex: Bool { FileManager.default.fileExists(atPath: HOME + "/.codex") }

    static var asked: Bool { UserDefaults.standard.object(forKey: key) != nil }

    /// The rtk Claude Code already runs that isn't the app's (a PreToolUse hook the user set up): its binary.
    static func usersOwn() -> String? {
        guard let data = FileManager.default.contents(atPath: CLAUDE_DIR + "/settings.json"),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let pre = (json["hooks"] as? [String: Any])?["PreToolUse"] as? [[String: Any]] else { return nil }
        for entry in pre {
            for hook in entry["hooks"] as? [[String: Any]] ?? [] {
                guard let cmd = hook["command"] as? String, cmd.contains("rtk"), cmd.contains(" hook ") else { continue }
                let bin = String(cmd.split(separator: " ").first ?? "")
                if bin != ours.path { return bin }
            }
        }
        return nil
    }

    /// Whether to ask, once, at a launch that ships rtk (the dashboard asks, in the app's own window: Cloud.askSaver).
    /// Someone already running their own rtk is saving already. `force`: asked anyway (staging, to see the question).
    static func shouldAsk(force: Bool = false) -> Bool {
        if force { return true }
        guard !asked, bundled != nil else { return false }
        if usersOwn() != nil {
            UserDefaults.standard.set(true, forKey: key)
            return false
        }
        return true
    }

    /// Settings' switch (and the first launch's answer). Done on a background queue: rtk writes the tools' settings.
    static func set(_ on: Bool, done: (@MainActor () -> Void)? = nil) {
        UserDefaults.standard.set(on, forKey: key)
        DispatchQueue.global(qos: .utility).async {
            if usersOwn() == nil { on ? install() : uninstall() }
            DispatchQueue.main.async { MainActor.assumeIsolated { done?() } }
        }
    }

    private static func install() {
        guard let src = bundled else { return }
        let fm = FileManager.default
        try? fm.createDirectory(at: ours.deletingLastPathComponent(), withIntermediateDirectories: true)
        if fm.contentsEqual(atPath: src.path, andPath: ours.path) == false {
            try? fm.removeItem(at: ours)
            try? fm.copyItem(at: src, to: ours)
        }
        // A downloaded app's files are quarantined; this one is the app's own and runs from Claude's hook.
        removexattr(ours.path, "com.apple.quarantine", 0)
        run(["init", "-g", "--auto-patch"])
        if codex { run(["init", "-g", "--codex"]) }
    }

    private static func uninstall() {
        guard FileManager.default.isExecutableFile(atPath: ours.path) else { return }
        run(["init", "-g", "--uninstall"])
        if codex { run(["init", "-g", "--codex", "--uninstall"]) }
    }

    @discardableResult
    private static func run(_ args: [String], bin: String? = nil) -> Data {
        let p = Process(), out = Pipe()
        p.executableURL = URL(fileURLWithPath: bin ?? ours.path)
        p.arguments = args
        p.standardInput = FileHandle.nullDevice
        p.standardOutput = out
        p.standardError = FileHandle.nullDevice
        guard (try? p.run()) != nil else { return Data() }
        let data = out.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        return data
    }

    /// For Settings: whether it's there, on, the user's own, and what it saved so far (rtk's `gain`).
    static func state() -> [String: Any] {
        let theirs = usersOwn()
        let on = theirs != nil || UserDefaults.standard.bool(forKey: key)
        var s: [String: Any] = ["available": bundled != nil || theirs != nil, "on": on, "theirs": theirs != nil]
        let bin = theirs ?? (FileManager.default.isExecutableFile(atPath: ours.path) ? ours.path : nil)
        if on, let bin, let j = try? JSONSerialization.jsonObject(with: run(["gain", "--format", "json"], bin: bin)) as? [String: Any],
           let sum = j["summary"] as? [String: Any] {
            s["saved"] = sum["total_saved"]
            s["pct"] = sum["avg_savings_pct"]
            s["commands"] = sum["total_commands"]
        }
        return s
    }
}

/// Settings' token saver requests (web/cloud.js): its state with what it saved, and the switch.
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
        case "set": TokenSavers.set(body["on"] as? Bool == true) { answer() }
        default: replyHandler(nil, "unknown request")
        }
    }
}
