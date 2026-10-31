import AppKit

@main
enum AppMain {
    @MainActor
    static func main() {
        // A terminal's link to its detached session (SyncRelay), not the app.
        let args = CommandLine.arguments
        if args.count > 2, args[1] == "--sync-relay" { SyncRelay.run(Array(args.dropFirst(2))) }
        let app = NSApplication.shared
        let delegate = AppDelegate()
        app.delegate = delegate
        app.setActivationPolicy(.regular)
        withExtendedLifetime(delegate) { app.run() }
    }
}
