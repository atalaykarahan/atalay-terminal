import AppKit
import UniformTypeIdentifiers

/// What a link opens when the user didn't see where it leads: a ⌘-click in a terminal (an OSC 8 link shows any text),
/// a link in a Markdown preview, a link on the dashboard. A web page or a mail opens in its app, a document in its app,
/// a folder in the Finder. An application, a program, a script or a file that starts one (a .terminal, a .webloc) is
/// shown in the Finder instead, as the Windows app shows such a file in File Explorer since 0.19.1; another app's link
/// (smb://, vscode://) asks first. The file rules are SwiftTerm's (1.99.3, from Ghostty's).
@MainActor
enum SafeOpen {
    static func open(_ url: URL) {
        if url.isFileURL { return file(url) }
        if web(url) { NSWorkspace.shared.open(url) } else { ask(url) }
    }

    /// A file or a folder: opened in its app, or shown in the Finder when opening it would start something.
    static func file(_ url: URL) {
        if runs(url) { NSWorkspace.shared.activateFileViewerSelecting([url]) } else { NSWorkspace.shared.open(url) }
    }

    nonisolated static func web(_ url: URL) -> Bool { ["http", "https", "mailto"].contains(url.scheme?.lowercased() ?? "") }

    /// Whether opening the file starts something: an application, a program, a script, or a file Launch Services hands to
    /// one by its extension. A link counts as the file it leads to; one that can't be read counts as starting something.
    nonisolated static func runs(_ url: URL) -> Bool {
        let real = url.standardizedFileURL.resolvingSymlinksInPath()
        guard let v = try? real.resourceValues(forKeys: [.contentTypeKey, .isDirectoryKey, .isExecutableKey]) else { return true }
        if startsByExtension.contains(real.pathExtension.lowercased()) { return true }
        if let type = v.contentType, [UTType.application, .executable, .script].contains(where: { type.conforms(to: $0) }) { return true }
        return v.isDirectory != true && v.isExecutable == true
    }

    nonisolated static let startsByExtension: Set<String> = [
        "action", "app", "applescript", "class", "command", "desktop", "fileloc", "inetloc", "jar", "mobileconfig", "mpkg",
        "pkg", "scpt", "terminal", "tool", "url", "webloc", "workflow",
    ]

    /// Another app's link: that app opens it once the user says so. Nothing on this Mac opens it: nothing happens.
    private static func ask(_ url: URL) {
        guard let app = NSWorkspace.shared.urlForApplication(toOpen: url) else { return }
        let alert = NSAlert()
        alert.messageText = "Open this link in \(FileManager.default.displayName(atPath: app.path))?"
        alert.informativeText = url.absoluteString
        alert.addButton(withTitle: "Open")
        alert.addButton(withTitle: "Cancel")
        if alert.runModal() == .alertFirstButtonReturn { NSWorkspace.shared.open(url) }
    }
}
