import AppKit
import SwiftUI

/// The app's colours, from the theme the user chose (ThemeStore, Themes.swift); the default is the brand orange #f88008
/// on warm near-black. Session status: the accent = working, cyan = your turn, warn = needs you.
enum Theme {
    private static var store: ThemeStore { .shared }
    static var accentHex: UInt32 { store.hex("--accent") }

    static var bg: NSColor { store.color("--bg") }
    // The terminals: the theme's own palette (the default one built on the brand orange: light text on dark orange, and
    // every colour in its warm range, modelled on a well-tuned iTerm2 theme).
    static var terminalBgHex: UInt32 { store.hex("--code-bg") }
    static var textHex: UInt32 { store.hex("--code-fg") }
    static var terminalBg: NSColor { store.color("--code-bg") }
    static var terminalCursor: NSColor { store.color("--code-cursor") }
    static var terminalCaretText: NSColor { store.color("--caret-text") }
    static var terminalSelection: NSColor { store.color("--selection") }
    static var terminalSelectionText: NSColor { store.color("--selection-text") }
    static var terminalLink: NSColor { store.color("--accent-soft") }
    static var panel: NSColor { store.color("--panel-rgb") }
    static var text: NSColor { store.color("--code-fg") }
    static var accent: NSColor { store.color("--accent") }

    static func mono(_ size: CGFloat, _ weight: NSFont.Weight = .regular) -> NSFont {
        NSFont.monospacedSystemFont(ofSize: size, weight: weight)
    }

    // SwiftUI palette: the dashboard page's tokens.
    static var cBg: Color { store.swiftUI("--bg") }
    static var cPanel: Color { store.swiftUI("--panel-rgb") }
    static var cLine: Color { store.swiftUI("--accent", opacity: 0.32) }
    static var cLineSoft: Color { store.swiftUI("--accent", opacity: 0.13) }
    static var cText: Color { store.swiftUI("--txt") }
    static var cHi: Color { store.swiftUI("--hi") }
    static var cDim: Color { store.swiftUI("--dim") }
    static var cDim2: Color { store.swiftUI("--dim2") }
    static var cAccent: Color { store.swiftUI("--accent") }
    static var cAccentSoft: Color { store.swiftUI("--accent-soft") }
    static var cViolet: Color { store.swiftUI("--violet") }
    static var cCyan: Color { store.swiftUI("--cyan") }
    static var cAlert: Color { store.swiftUI("--warn") }
    static var cAmber: Color { store.swiftUI("--amber") }
    static var cGreen: Color { store.swiftUI("--green") }
    static var cRed: Color { store.swiftUI("--red") }
    static var cInk: Color { store.swiftUI("--ink") }

    static var statusHex: [String: UInt32] {
        ["busy": accentHex, "idle": store.hex("--cyan"), "waiting": store.hex("--warn"), "terminal": store.hex("--cyan")]
    }
    static var endedHex: UInt32 { store.hex("--ended") }

    static func statusColor(_ status: String?) -> Color {
        Color(hex: statusHex[status ?? ""] ?? endedHex)
    }

    static func statusLabel(_ status: String?) -> String {
        switch status {
        case "busy": return "WORKING"
        case "idle": return "YOUR TURN"
        case "waiting": return "NEEDS YOU"
        case "starting": return "STARTING"
        case "terminal": return "TERMINAL"
        default: return "ENDED"
        }
    }

    static var catHex: [String: UInt32] {
        ["web": store.hex("--sky"), "browser": store.hex("--blue"), "read": store.hex("--green"), "search": store.hex("--lime"),
         "edit": store.hex("--amber"), "bash": store.hex("--orange"), "agent": store.hex("--violet"), "mcp": store.hex("--magenta"),
         "plan": store.hex("--lavender")]
    }
    static var planHex: UInt32 { store.hex("--lavender") }
    static let catLabel: [String: String] = [
        "web": "web", "browser": "browser", "read": "read", "search": "search", "edit": "edit",
        "bash": "shell", "agent": "agents", "mcp": "mcp", "plan": "plan",
    ]

    // The 16 ANSI colours (normal 0-7, bright 8-15).
    static var ansi: [UInt32] { (0..<16).map { store.hex("--a\($0)") } }
}

extension NSColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1) {
        self.init(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: alpha)
    }
}

extension Color {
    init(hex: UInt32, opacity: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xFF) / 255, green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255, opacity: opacity)
    }
}

extension Font {
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: size, weight: weight, design: .monospaced)
    }
}
