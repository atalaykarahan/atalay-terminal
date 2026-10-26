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
}
