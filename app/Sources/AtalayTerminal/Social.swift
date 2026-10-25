import Foundation
import IOKit

/// The app's live line to the API for friends and messages: one WebSocket the API pushes events into (a message,
/// a friend request, a friend coming online). It opens once this Mac is signed in and reopens on its own after a
/// drop, at once when the network comes back. Each event goes, as the API sent it, to the dashboard page and the
/// message panel.
@MainActor
final class Social {
    static let shared = Social()
    var onEvent: ((String) -> Void)?

    private var task: URLSessionWebSocketTask?
    private var opening = false
    private var delay: TimeInterval = 2
    private var retry: DispatchWorkItem?
    private var pinger: Timer?
    private var signedIn = false
    private var away = false
    private var awayTimer: Timer?

    /// Cloud's state changed: keep the line open while signed in and the API answers.
    func sync(_ s: Cloud.State) {
        signedIn = s.registered == true
        if signedIn, s.reachable { open() }
        if !signedIn { close() }
    }

    /// The network came back or the Mac woke up: a line opened before may be dead without anyone noticing (no
    /// error comes until something is sent), so start a fresh one now instead of waiting out a backoff.
    func kick() {
        delay = 2
        if let t = task {
            task = nil
            pinger?.invalidate()
            pinger = nil
            t.cancel(with: .goingAway, reason: nil)
        }
        open()
    }

    private func open() {
        guard signedIn, task == nil, !opening else { return }
        opening = true
        retry?.cancel()
        Task {
            defer { opening = false }
            guard let ticket = await Cloud.shared.liveTicket() else { return later() }
            let t = URLSession.shared.webSocketTask(with: Cloud.shared.liveURL(ticket: ticket))
            task = t
            t.resume()
            receive(t)
            ping(t)
            watchInput()
            tellAway()
        }
    }

    private func receive(_ t: URLSessionWebSocketTask) {
        t.receive { [weak self] result in
            Task { @MainActor in
                guard let self, self.task === t else { return }
                switch result {
                case let .success(.string(text)):
                    self.delay = 2
                    self.onEvent?(text)
                    self.receive(t)
                case .success:
                    self.receive(t)
                case .failure:
                    self.drop(t)
                }
            }
        }
    }

    /// The API pings every 25 s; this side checks too, so a line that died silently (sleep, a network switch) is
    /// noticed within half a minute. A dead connection doesn't fail the ping, it just never answers: no pong within
    /// 10 s counts as dead.
    private func ping(_ t: URLSessionWebSocketTask) {
        pinger?.invalidate()
        let timer = Timer(timeInterval: 25, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.task === t else { return }
                let answered = Answered()
                t.sendPing { error in
                    answered.flag = true
                    guard error != nil else { return }
                    Task { @MainActor in self.drop(t) }
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                    MainActor.assumeIsolated {
                        if !answered.flag { self?.drop(t) }
                    }
                }
            }
        }
        timer.tolerance = 5
        RunLoop.main.add(timer, forMode: .common)
        pinger = timer
    }

    // MARK: away from keyboard

    /// Like Discord's idle: no key, mouse or trackpad input anywhere on this Mac for 10 minutes. Friends then see
    /// "idle" while the user's own status is online; any input brings it back.
    private func watchInput() {
        guard awayTimer == nil else { return }
        let t = Timer(timeInterval: 30, repeats: true) { _ in Task { @MainActor in Social.shared.checkAway() } }
        t.tolerance = 10
        RunLoop.main.add(t, forMode: .common)
        awayTimer = t
    }

    private func checkAway() {
        let now = Self.idleSeconds() > 600
        guard now != away else { return }
        away = now
        tellAway()
    }

    private func tellAway() {
        task?.send(.string(away ? #"{"type":"afk","afk":true}"# : #"{"type":"afk","afk":false}"#)) { _ in }
    }

    /// Seconds since the last input on this Mac (IOHIDSystem's HIDIdleTime, in nanoseconds).
    private static func idleSeconds() -> Double {
        let service = IOServiceGetMatchingService(kIOMainPortDefault, IOServiceMatching("IOHIDSystem"))
        defer { IOObjectRelease(service) }
        guard service != 0,
              let value = IORegistryEntryCreateCFProperty(service, "HIDIdleTime" as CFString, kCFAllocatorDefault, 0)?
                  .takeRetainedValue() as? NSNumber else { return 0 }
        return value.doubleValue / 1_000_000_000
    }

    private func drop(_ t: URLSessionWebSocketTask) {
        guard task === t else { return }
        t.cancel(with: .goingAway, reason: nil)
        task = nil
        pinger?.invalidate()
        pinger = nil
        later()
    }

    private func later() {
        guard signedIn else { return }
        retry?.cancel()
        let work = DispatchWorkItem { Task { @MainActor in Social.shared.open() } }
        retry = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
        delay = min(delay * 2, 60)
    }

    /// Set from the ping's completion (any thread), read on the main thread 10 s later.
    private final class Answered: @unchecked Sendable { var flag = false }

    private func close() {
        retry?.cancel()
        pinger?.invalidate()
        pinger = nil
        task?.cancel(with: .goingAway, reason: nil)
        task = nil
    }
}
