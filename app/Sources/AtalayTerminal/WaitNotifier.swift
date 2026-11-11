import AppKit

/// A chat waiting for the user (an approval, a question) while the app is behind other windows: a notice in the
/// screen's corner, the app's own (MessagePanel.notices, not macOS's), until the chat moves on or the app comes to the
/// front. With the app in front nothing pops up: the chat itself shows that it waits.
@MainActor
final class WaitNotifier {
    static let shared = WaitNotifier()

    /// The name the chat list shows for a chat (a renamed one's own).
    var titleOf: ((SessionBrief) -> String)?
    /// What each waiting chat waits for, as last seen.
    private var waits: [String: String] = [:]
    /// Chats with a notice in the corner.
    private var shown = Set<String>()
    /// The first state only says what was already waiting at launch: no notices for that.
    private var primed = false

    private init() {
        NotificationCenter.default.addObserver(forName: NSApplication.didBecomeActiveNotification, object: nil, queue: .main) { _ in
            MainActor.assumeIsolated { WaitNotifier.shared.clear() }
        }
    }

    func update(_ briefs: [SessionBrief]) {
        var now: [String: String] = [:]
        var byId: [String: SessionBrief] = [:]
        for b in briefs where b.live && b.status == "waiting" {
            now[b.id] = b.waitingFor ?? ""
            byId[b.id] = b
        }
        for id in shown where now[id] == nil { MessagePanel.notices.waitOver(id) }
        shown = shown.filter { now[$0] != nil }
        if primed, !NSApp.isActive {
            for (id, what) in now {
                guard let b = byId[id] else { continue }
                // Still the same wait: one notice is enough. Another question in the same chat is a new one.
                if let before = waits[id], before.isEmpty || what.isEmpty || before == what { continue }
                MessagePanel.notices.wait(notice(b))
                shown.insert(id)
            }
        }
        waits = now
        primed = true
    }

    /// The app came to the front: the user sees the chats themselves.
    private func clear() {
        shown.forEach { MessagePanel.notices.waitOver($0) }
        shown.removeAll()
    }

    private func notice(_ b: SessionBrief) -> [String: String] {
        // Streamer mode: the made-up names the dashboard shows.
        let streamer = Streamer.on
        let folder = streamer ? Streamer.project(b.cwd) : (b.cwd as NSString).lastPathComponent
        let real = titleOf?(b) ?? b.title
        let name = streamer && !real.isEmpty ? Streamer.fake("title", real) : real
        let tool = b.id.hasPrefix("ai:") ? "\(b.name) · " : ""
        let what = b.waitingFor.flatMap { $0.isEmpty ? nil : streamer ? Streamer.fake("wait", $0) : $0 } ?? "waiting for your approval"
        return ["sid": b.id, "title": clip(name.isEmpty ? folder : name, 80), "folder": tool + folder, "what": clip(what, 200)]
    }
}
