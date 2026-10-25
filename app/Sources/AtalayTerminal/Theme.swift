import AppKit
import SwiftUI

/// One palette for the whole app: brand orange #f88008 on warm near-black.
/// Session status: orange = working, cyan = your turn, red = needs you.
enum Theme {
    static let accentHex: UInt32 = 0xF88008

    static let bg = NSColor(hex: 0x0A0705)
    static let terminalBg = NSColor(hex: 0x0D0805)
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

    // ANSI palette for the terminals (normal 0-7, bright 8-15), tuned to the brand.
    static let ansi: [UInt32] = [
        0x1A120B, 0xFF4D4D, 0x3DFFA8, 0xFFD23F, 0x5B8CFF, 0xE879F9, 0x00E5FF, 0xF5EBE0,
        0x4D3F33, 0xFF7A7A, 0x7DFFC4, 0xFFE28A, 0x9FB4FF, 0xF0ABFC, 0x6FF2FF, 0xFFFFFF,
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
