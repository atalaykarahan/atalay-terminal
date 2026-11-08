import Foundation

/// Whether the user is working right now, sent with every heartbeat for XP (docs/xp-plan.md): someone at the keyboard
/// (input on this Mac in the last five minutes) and a sign of work in the last five minutes: a Claude session busy,
/// a job in one of the app's terminals using the CPU, or typing in a chat or terminal window. Any tool counts (Claude,
/// Codex, Gemini, a build) as long as it runs where the app sees it; a video or a mouse jiggler alone doesn't.
@MainActor
enum Activity {
    private static var lastWork = -Double.infinity

    /// Something that counts as work just happened.
    static func work() { lastWork = ProcessInfo.processInfo.systemUptime }

    static var active: Bool {
        Social.idleSeconds() < 300 && ProcessInfo.processInfo.systemUptime - lastWork < 300
    }

    /// The AI tools seen at work (a session busy), for their badges (the API's badges.ts): claude, codex, gemini, antigravity.
    private static var toolsAt: [String: TimeInterval] = [:]

    /// A session of `tool` (a brief's name: "Codex", "Gemini", "Antigravity"…; Claude's sessions are Claude) is busy.
    static func toolAtWork(_ tool: String) {
        let key: String
        switch tool.lowercased() {
        case "claude": key = "claude"
        case "codex": key = "codex"
        case "gemini": key = "gemini"
        case "antigravity": key = "antigravity"
        default: return
        }
        toolsAt[key] = ProcessInfo.processInfo.systemUptime
    }

    /// The tools at work since the last heartbeat (a minute and a half, for slack).
    static var tools: [String] {
        let now = ProcessInfo.processInfo.systemUptime
        return toolsAt.filter { now - $0.value < 90 }.map(\.key).sorted()
    }
}
