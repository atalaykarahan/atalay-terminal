import AppKit
import CoreText
import SwiftUI

/// MUR47 (themes.json) in the chat windows, which are native here rather than a page: the part of what
/// web/themes/mur47.css gives the dashboard and the Windows app's chat windows that a chat window's header can show. A
/// walnut stock behind the title row, the 47 mark and stencil lettering. Nothing here shows under any other theme.
/// (The crosshair cursor isn't here: SwiftTerm's TerminalView sets its own I-beam in methods it doesn't let a subclass
/// override, resetCursorRects and cursorUpdate.)
enum Mur47 {
    static let id = "mur47"
    static var on: Bool { ThemeStore.shared.current.id == id }

    /// Its two fonts (web/themes/fonts, SIL Open Font License), for this app only. Once, at launch.
    static func registerFonts() {
        let dir = RadarView.webDirectory().appendingPathComponent("themes/fonts")
        for name in ["BlackOpsOne-Regular.ttf", "ShareTechMono-Regular.ttf"] {
            CTFontManagerRegisterFontsForURL(dir.appendingPathComponent(name) as CFURL, .process, nil)
        }
    }

    /// Stencil lettering (Black Ops One), the mono face's size when the font is missing.
    static func stencil(_ size: CGFloat) -> Font {
        NSFont(name: "Black Ops One", size: size) != nil ? .custom("Black Ops One", size: size) : .mono(size, .bold)
    }

    static let titleText = Color(hex: 0xF3E6D8)
}

/// The title row's walnut stock: the wood's colour along its length, its grain a little off level so it wanders, and a
/// varnish's sheen on top, darker at the foot. As the Windows chat window's (windows/pages/mur47.css).
struct Mur47Backdrop: View {
    var body: some View {
        Canvas { ctx, size in
            let row = CGRect(x: 0, y: 0, width: size.width, height: 32)
            ctx.fill(Path(row), with: .linearGradient(Gradient(stops: [
                .init(color: Color(hex: 0x5E3018), location: 0),
                .init(color: Color(hex: 0x74401F), location: 0.22),
                .init(color: Color(hex: 0x5A2B13), location: 0.48),
                .init(color: Color(hex: 0x6F3B1C), location: 0.74),
                .init(color: Color(hex: 0x58290F), location: 1),
            ]), startPoint: .zero, endPoint: CGPoint(x: size.width, y: 0)))

            var dark = Path(), light = Path()
            let steps: [CGFloat] = [2.5, 3.5, 2, 4, 3]
            var y: CGFloat = 1.5, i = 0
            while y < row.maxY {
                let sign: CGFloat = i % 2 == 0 ? 1 : -1
                let drift = sign * min(6, size.width * 0.01)
                if i % 3 == 0 {
                    light.move(to: CGPoint(x: 0, y: y))
                    light.addLine(to: CGPoint(x: size.width, y: y + drift))
                } else {
                    dark.move(to: CGPoint(x: 0, y: y))
                    dark.addLine(to: CGPoint(x: size.width, y: y + drift))
                }
                y += steps[i % steps.count]
                i += 1
            }
            ctx.stroke(dark, with: .color(Color(hex: 0x190A03, opacity: 0.38)), lineWidth: 1)
            ctx.stroke(light, with: .color(Color(hex: 0x964E22, opacity: 0.3)), lineWidth: 1)

            ctx.fill(Path(row), with: .linearGradient(Gradient(stops: [
                .init(color: Color(hex: 0xFFD6AA, opacity: 0.16), location: 0),
                .init(color: Color(hex: 0xFFD6AA, opacity: 0.04), location: 0.35),
                .init(color: .clear, location: 0.55),
                .init(color: Color.black.opacity(0.28), location: 1),
            ]), startPoint: .zero, endPoint: CGPoint(x: 0, y: row.maxY)))
        }
    }
}
