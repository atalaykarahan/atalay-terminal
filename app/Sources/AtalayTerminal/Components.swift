import SwiftUI

/// Status light: orange = working, cyan = your turn, red = needs you, grey = ended.
/// A working or waiting light pulses through Core Animation, which runs the pulse without SwiftUI: a SwiftUI animation
/// re-rendered the whole sidebar on every frame of the display, about a quarter of a core even behind other windows.
struct StatusDot: View {
    let status: String?
    var size: CGFloat = 7
    var hollow = false

    var body: some View {
        StatusDotLayer(status: status, size: size, hollow: hollow)
            .frame(width: size, height: size)
            // Clicks, hover and the context menu stay the row's, as with the SwiftUI circle the light was.
            .allowsHitTesting(false)
    }
}

/// The light itself, a layer of its own (StatusDot).
struct StatusDotLayer: NSViewRepresentable {
    let status: String?
    let size: CGFloat
    let hollow: Bool

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        // A layer of our own (a layer-hosting view): AppKit's backing layer turned clipping back on after the first
        // update, which cut off the glow past the light's 7 pt. A shape, so a hollow light's ring sits on the circle's
        // edge as SwiftUI's stroke did (a border would sit inside it, a point smaller).
        view.layer = CAShapeLayer()
        view.wantsLayer = true
        return view
    }

    func updateNSView(_ view: NSView, context: Context) {
        guard let layer = view.layer as? CAShapeLayer else { return }
        Self.style(layer, status: status, size: size, hollow: hollow)
    }

    /// The light's colours (the theme's, so set at each update) and its pulse: the glow 1 to 5, and a waiting light's
    /// opacity 0.35 to 1, back and forth.
    static func style(_ layer: CAShapeLayer, status: String?, size: CGFloat, hollow: Bool) {
        let color = NSColor(hex: Theme.statusHex[status ?? ""] ?? Theme.endedHex).cgColor
        layer.path = CGPath(ellipseIn: CGRect(x: 0, y: 0, width: size, height: size), transform: nil)
        layer.fillColor = hollow ? nil : color
        layer.strokeColor = hollow ? color : nil
        layer.lineWidth = 1
        layer.shadowColor = color
        layer.shadowOpacity = hollow ? 0 : 0.9
        layer.shadowOffset = .zero
        layer.shadowRadius = 1
        let duration = status == "waiting" ? 0.5 : 0.9
        func pulse(_ key: String, _ keyPath: String, from: CGFloat, to: CGFloat, while on: Bool) {
            guard on else { return layer.removeAnimation(forKey: key) }
            // Kept while it runs at this status's pace: added again at each update, it would restart.
            if (layer.animation(forKey: key) as? CABasicAnimation)?.duration == duration { return }
            let a = CABasicAnimation(keyPath: keyPath)
            a.fromValue = from
            a.toValue = to
            a.duration = duration
            a.autoreverses = true
            a.repeatCount = .infinity
            a.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            layer.add(a, forKey: key)
        }
        pulse("glow", "shadowRadius", from: 1, to: 5, while: status == "busy" || status == "waiting")
        pulse("fade", "opacity", from: 0.35, to: 1, while: status == "waiting")
    }
}
