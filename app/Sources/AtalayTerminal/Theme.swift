import AppKit
import SwiftUI

/// One palette for the whole app: brand orange #f88008 on warm near-black.
/// Session status: orange = working, cyan = your turn, red = needs you.
enum Theme {
    static let accentHex: UInt32 = 0xF88008

    static let bg = NSColor(hex: 0x0A0705)
    // The terminals, built on the brand orange: light text on dark orange, and every colour in its warm range
    // (oranges, peach, amber, reds, pinks, a warm green), modelled on a well-tuned iTerm2 theme: as many distinct
    // colours, with its lightness and contrast where the warm range allows.
    static let terminalBg = NSColor(hex: 0x251200)
    static let terminalCursor = NSColor(hex: accentHex)
    static let terminalLink = NSColor(hex: 0xFFB057)
    static let panel = NSColor(hex: 0x160D07)
    static let text = NSColor(hex: 0xF5EBE0)
    static let accent = NSColor(hex: accentHex)

    static func mono(_ size: CGFloat, _ weight: NSFont.Weight = .regular) -> NSFont {
        NSFont.monospacedSystemFont(ofSize: size, weight: weight)
    }

    // SwiftUI palette, mirrors the dashboard page tokens.
    static let cBg = Color(hex: 0x0A0705)
    static let cPanel = Color(hex: 0x160D07)
    static let cLine = Color(hex: accentHex, opacity: 0.32)
    static let cLineSoft = Color(hex: accentHex, opacity: 0.13)
    static let cText = Color(hex: 0xF5EBE0)
    static let cHi = Color(hex: 0xFFF8F0)
    static let cDim = Color(hex: 0x8F7A66)
    static let cDim2 = Color(hex: 0x4D3F33)
    static let cAccent = Color(hex: accentHex)
    static let cAccentSoft = Color(hex: 0xFFB057)
    static let cViolet = Color(hex: 0x9D6BFF)
    static let cCyan = Color(hex: 0x00E5FF)
    static let cAlert = Color(hex: 0xFF2E63)
    static let cAmber = Color(hex: 0xFFD23F)
    static let cGreen = Color(hex: 0x3DFFA8)
    static let cRed = Color(hex: 0xFF4D4D)

    static let statusHex: [String: UInt32] = ["busy": accentHex, "idle": 0x00E5FF, "waiting": 0xFF2E63, "terminal": 0x00E5FF]

    static func statusColor(_ status: String?) -> Color {
        Color(hex: statusHex[status ?? ""] ?? 0x5C4D40)
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

    static let catHex: [String: UInt32] = [
        "web": 0x38BDF8, "browser": 0x5B8CFF, "read": 0x3DFFA8, "search": 0xB8FF3D, "edit": 0xFFD23F,
        "bash": 0xFF5C8A, "agent": 0x9D6BFF, "mcp": 0xE879F9, "plan": 0xA99BC4,
    ]
    static let catLabel: [String: String] = [
        "web": "web", "browser": "browser", "read": "read", "search": "search", "edit": "edit",
        "bash": "shell", "agent": "agents", "mcp": "mcp", "plan": "plan",
    ]

    // Their 16 ANSI colours (normal 0-7, bright 8-15): dark brown (black), red, warm green, amber, deep orange
    // (blue), rose (magenta), coral (cyan), peach (white); then taupe and the bright ones, the brand orange as blue.
    static let ansi: [UInt32] = [
        0x562F18, 0xFF4D4D, 0xC5E35A, 0xFFD23F, 0xC16100, 0xE0849C, 0xFF7345, 0xFFB27A,
        0x7D6553, 0xFF5C8A, 0xDDF08F, 0xFFE28A, 0xF88008, 0xFFA8C4, 0xFF9B73, 0xFFF3E6,
    ]
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
