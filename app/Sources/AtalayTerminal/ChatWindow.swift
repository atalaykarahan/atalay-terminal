import AppKit
import QuartzCore
import SwiftTerm
import SwiftUI

// MARK: - live model for one chat window

struct TickerChip: Identifiable, Equatable {
    let id: Int
    let tag: String
    let text: String
    let hex: UInt32
    let at: Date
}

@MainActor
final class ChatHUD: ObservableObject {
    @Published var brief: SessionBrief?
    /// Folder of a window opened as a terminal: Claude runs there only when started (or resumed) by hand.
    let terminalDir: String?
    @Published var exited = false
    @Published var attached = true
    /// Above every app's windows (floating), like an always-on-top pin.
    @Published var onTop = false
    /// A second screen on a chat another build of the app runs: closing it leaves the chat running.
    var mirror = false
    @Published var chips: [TickerChip] = []
    /// False while the window is hidden, so its clocks stop ticking.
    @Published var visible = false
    private var seq = 0

    init(terminalDir: String?) { self.terminalDir = terminalDir }

    /// A terminal window is a chat while Claude runs in it, and a terminal again once Claude exits.
    var status: String {
        if exited { return "ended" }
        if let b = brief, b.live || terminalDir == nil { return b.status }
        return terminalDir != nil ? "terminal" : "starting"
    }

    func push(_ e: NativeEvent) {
        if e.kind == "usage" || e.kind == "result" { return }
        let hex: UInt32 = e.kind == "prompt" ? ThemeStore.shared.hex("--accent-soft") : e.kind == "say" ? ThemeStore.shared.hex("--txt2")
            : Theme.catHex[e.cat ?? ""] ?? Theme.planHex
        // Another AI tool's answer (Codex's, Antigravity's: their sessions are "ai:…") is its own, not Claude's.
        let tag = e.kind == "tool" ? Theme.catLabel[e.cat ?? ""] ?? "tool" : e.kind == "prompt" ? "you"
            : e.kind == "say" ? (e.sid.hasPrefix("ai:") ? "reply" : "claude") : e.kind
        seq += 1
        withAnimation(.spring(response: 0.38, dampingFraction: 0.8)) {
            chips.append(TickerChip(id: seq, tag: tag, text: String(e.label.prefix(42)), hex: hex, at: Date()))
            if chips.count > 9 { chips.removeFirst(chips.count - 9) }
        }
    }
}

// MARK: - formatting

private func fmtTok(_ n: Int) -> String {
    let d = Double(n)
    if d >= 1e6 { return String(format: "%.1fM", d / 1e6) }
    if d >= 1e4 { return "\(Int((d / 1e3).rounded()))k" }
    if d >= 1e3 { return String(format: "%.1fk", d / 1e3) }
    return "\(n)"
}

private func fmtUsd(_ n: Double) -> String {
    n >= 100 ? String(format: "$%.0f", n) : n >= 0.01 ? String(format: "$%.2f", n) : n > 0 ? String(format: "$%.3f", n) : "$0"
}

private func fmtDur(_ ms: Double) -> String {
    let s = Int(max(0, ms) / 1000)
    if s < 60 { return "\(s)s" }
    if s < 3600 { return "\(s / 60)m\(String(format: "%02d", s % 60))" }
    return "\(s / 3600)h\(String(format: "%02d", (s % 3600) / 60))"
}

private func clock(_ ms: Double) -> String {
    let s = Int(max(0, ms) / 1000)
    let h = s / 3600, m = (s % 3600) / 60, x = s % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, x) : String(format: "%d:%02d", m, x)
}

private func nowMsDate(_ d: Date) -> Double { d.timeIntervalSince1970 * 1000 }

// MARK: - header (title row + HUD row)

struct ChatHeaderView: View {
    @ObservedObject var hud: ChatHUD
    @ObservedObject var theme = ThemeStore.shared
    let onTogglePin: () -> Void
    let onDashboard: () -> Void
    let onEnd: () -> Void
    let onCopyReply: () -> Void

    var body: some View {
        // Clocks tick once a second. Per-frame effects here kept the main thread busy and froze the
        // app with several chats open; the moving parts of a chat window are Core Animation layers.
        TimelineView(.periodic(from: .now, by: hud.visible ? 1 : 3600)) { tl in
            let status = hud.status
            let hex = Theme.statusHex[status] ?? Theme.endedHex
            ZStack(alignment: .topLeading) {
                if Mur47.on { Mur47Backdrop() } else { HeaderBackdrop(hex: hex) }
                VStack(alignment: .leading, spacing: 0) {
                    TitleRow(hud: hud, now: tl.date, status: status, hex: hex)
                        .frame(height: 32)
                    HUDRow(hud: hud, now: tl.date, hex: hex, onTogglePin: onTogglePin, onDashboard: onDashboard, onEnd: onEnd, onCopyReply: onCopyReply)
                        .frame(height: 30)
                }
            }
        }
        .id(theme.current.id)
        .frame(height: 62)
        .ignoresSafeArea()
    }
}

private struct TitleRow: View {
    @ObservedObject var hud: ChatHUD
    let now: Date
    let status: String
    let hex: UInt32

    var body: some View {
        let color = Color(hex: hex)
        let dir = status == "terminal" ? hud.terminalDir : nil
        let name = dir.map { ($0 as NSString).lastPathComponent } ?? hud.brief?.name ?? "chat"
        let title = dir.map(tildify) ?? hud.brief?.title ?? ""
        let mur47 = Mur47.on
        HStack(spacing: 8) {
            if mur47 {
                // MUR47: its mark in place of the hexagon, the name in stencil on the walnut
                Text("47")
                    .font(Mur47.stencil(15))
                    .foregroundColor(Theme.cAccent)
                    .shadow(color: Theme.cAccent.opacity(0.7), radius: 6)
                Text(name.uppercased())
                    .font(Mur47.stencil(12))
                    .tracking(1.4)
                    .foregroundColor(Mur47.titleText)
                    .shadow(color: .black.opacity(0.7), radius: 0, x: 0, y: 1)
                    .lineLimit(1)
            } else {
                Image(systemName: "hexagon")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(color)
                    .shadow(color: color, radius: 6)
                Text(name)
                    .font(.mono(12, .bold))
                    .foregroundColor(Theme.cAccent)
                    .shadow(color: Theme.cAccent.opacity(0.6), radius: 6)
                    .lineLimit(1)
            }
            Text("·").font(.mono(12)).foregroundColor(mur47 ? Mur47.titleText.opacity(0.6) : Theme.cDim2)
            Text(title)
                .font(.mono(12))
                .foregroundColor(mur47 ? Mur47.titleText : Theme.cHi)
                .shadow(color: mur47 ? .black.opacity(0.6) : .clear, radius: 0, x: 0, y: 1)
                .lineLimit(1)
                .truncationMode(.tail)
            Spacer(minLength: 8)
            StatusPill(status: status, hex: hex, since: hud.brief?.statusSince ?? 0, waitingFor: hud.brief?.waitingFor, now: now)
        }
        .padding(.leading, 80)
        .padding(.trailing, 12)
    }
}

private struct StatusPill: View {
    let status: String
    let hex: UInt32
    let since: Double
    let waitingFor: String?
    let now: Date

    var body: some View {
        let color = Color(hex: hex)
        let timed = (status == "busy" || status == "idle" || status == "waiting") && since > 0
        let label = Theme.statusLabel(status) + (timed ? " " + clock(nowMsDate(now) - since) : "")
        let waiting = status == "waiting"
        Text(label)
            .font(.mono(10.5, .bold))
            .tracking(1.2)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .foregroundColor(waiting ? Theme.cInk : color)
            .background(waiting ? color : color.opacity(0.14))
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(color, lineWidth: 1))
            .shadow(color: color.opacity(0.6), radius: 8)
            .opacity(waiting && Int(now.timeIntervalSinceReferenceDate) % 2 == 0 ? 0.45 : 1)
            .help(waitingFor ?? "")
    }
}

private struct HUDRow: View {
    @ObservedObject var hud: ChatHUD
    let now: Date
    let hex: UInt32
    let onTogglePin: () -> Void
    let onDashboard: () -> Void
    let onEnd: () -> Void
    let onCopyReply: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            if let dir = hud.terminalDir, hud.status == "terminal" {
                Text("terminal in \(tildify(dir))").foregroundColor(Theme.cDim).lineLimit(1)
            } else if let b = hud.brief {
                ContextBar(ctx: b.ctx, ctxMax: b.ctxMax)
                if !b.model.isEmpty {
                    Text([b.model, b.effort].filter { !$0.isEmpty }.joined(separator: " · ")).foregroundColor(Theme.cDim)
                }
                Text(fmtUsd(b.cost)).foregroundColor(Theme.cAmber).fontWeight(.semibold)
                Counts(b: b)
                if !b.actionName.isEmpty {
                    ActionLabel(b: b, now: now)
                }
            } else {
                Text("starting claude…").foregroundColor(Theme.cDim)
            }
            Spacer(minLength: 6)
            if let b = hud.brief, !b.spark.isEmpty, hud.status != "terminal" {
                SparkView(values: b.spark, hex: hex).frame(width: 96, height: 18)
            }
            if hud.status != "terminal" {
                HUDButton(symbol: "doc.on.doc", active: false,
                          help: "Copy Claude's last reply, all of it, even past what fits the window (⇧⌘C)", hex: hex, action: onCopyReply)
            }
            HUDButton(symbol: hud.onTop ? "pin.fill" : "pin", active: hud.onTop,
                      help: hud.onTop ? "Pinned on top of every app, on any desktop. Click to put it back above the dashboard."
                          : "Pin on top of every app (Discord, Chrome…). It leaves the dashboard, even a full-screen one.",
                      hex: hex, action: onTogglePin)
            HUDButton(symbol: "square.grid.2x2", active: false, help: "Back to the dashboard (this chat keeps running)", hex: hex, action: onDashboard)
            HUDButton(symbol: "power", active: false,
                      help: hud.mirror ? "Close this mirror (the chat keeps running in the other app)" : hud.status == "terminal" ? "Close this terminal" : "End this chat",
                      hex: ThemeStore.shared.hex("--red"), action: onEnd)
        }
        .font(.mono(10.5))
        .lineLimit(1)
        .padding(.horizontal, 12)
        .background(Color.black.opacity(0.16))
        .overlay(alignment: .top) { Rectangle().fill(Color(hex: hex, opacity: 0.18)).frame(height: 1) }
        .overlay(alignment: .bottom) { Rectangle().fill(Color(hex: hex, opacity: 0.35)).frame(height: 1) }
    }
}

private struct ContextBar: View {
    let ctx: Int
    let ctxMax: Double

    var body: some View {
        let frac = ctxMax > 0 ? min(1, Double(ctx) / ctxMax) : 0
        HStack(spacing: 6) {
            Text("ctx").foregroundColor(Theme.cDim)
            ZStack(alignment: .leading) {
                Rectangle().fill(Color.white.opacity(0.08))
                Rectangle()
                    .fill(LinearGradient(colors: [Theme.cAccent, Theme.cAmber], startPoint: .leading, endPoint: .trailing))
                    .frame(width: 110 * frac)
                    .shadow(color: Theme.cAccent.opacity(0.7), radius: 4)
            }
            .frame(width: 110, height: 6)
            Text("\(fmtTok(ctx))\(ctxMax > 0 ? " / " + fmtTok(Int(ctxMax)) : "")").foregroundColor(Theme.cText)
        }
    }
}

private struct Counts: View {
    let b: SessionBrief

    var body: some View {
        HStack(spacing: 0) {
            Text("\(b.tools)").foregroundColor(Theme.cText).fontWeight(.semibold)
            Text(" tools · ").foregroundColor(Theme.cDim)
            Text("\(b.web)").foregroundColor(Theme.cText).fontWeight(.semibold)
            Text(" web · ").foregroundColor(Theme.cDim)
            Text("\(b.errors)").foregroundColor(b.errors > 0 ? Theme.cRed : Theme.cText).fontWeight(.semibold)
            Text(" err").foregroundColor(Theme.cDim)
            if b.agentsRunning > 0 {
                Text(" · ⤷\(b.agentsRunning)").foregroundColor(Theme.cViolet).fontWeight(.semibold)
            }
        }
    }
}

private struct ActionLabel: View {
    let b: SessionBrief
    let now: Date

    var body: some View {
        let color = Color(hex: Theme.catHex[b.actionCat] ?? Theme.planHex)
        HStack(spacing: 5) {
            Text("▸ \(b.actionName)").foregroundColor(color).fontWeight(.bold)
            Text(b.actionLabel)
                .foregroundColor(Theme.cText)
                .truncationMode(.tail)
            Text(fmtDur(nowMsDate(now) - b.actionSince)).foregroundColor(Theme.cDim)
        }
        .layoutPriority(-1)
    }
}

private struct SparkView: View {
    let values: [Int]
    let hex: UInt32

    var body: some View {
        Canvas { ctx, size in
            let maxV = max(1, values.max() ?? 1)
            let bw = size.width / CGFloat(max(1, values.count))
            for (i, v) in values.enumerated() {
                let h = v > 0 ? max(3, CGFloat(v) / CGFloat(maxV) * (size.height - 2)) : 2
                let alpha = v > 0 ? 0.85 : 0.18
                ctx.fill(Path(CGRect(x: CGFloat(i) * bw + 0.5, y: size.height - h, width: bw - 1, height: h)),
                         with: .color(Color(hex: hex, opacity: alpha)))
            }
        }
    }
}

private struct HUDButton: View {
    let symbol: String
    let active: Bool
    let help: String
    let hex: UInt32
    let action: () -> Void
    @State private var hover = false

    var body: some View {
        let color = Color(hex: hex)
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(active ? Theme.cInk : (hover ? Theme.cHi : Theme.cDim))
                .frame(width: 24, height: 20)
                // The whole square takes the click, not only the symbol's own pixels (a plain button's default):
                // the power symbol is a thin ring, and most clicks on it missed.
                .contentShape(Rectangle())
                .background(active ? color : Color.clear)
                .overlay(Rectangle().stroke(color.opacity(hover || active ? 1 : 0.4), lineWidth: 1))
                .shadow(color: hover ? color.opacity(0.6) : .clear, radius: 6)
        }
        .buttonStyle(.plain)
        .onHover { hover = $0 }
        .help(help)
    }
}

private struct HeaderBackdrop: View {
    let hex: UInt32

    var body: some View {
        Canvas { ctx, size in
            let color = Color(hex: hex)
            ctx.fill(Path(CGRect(x: 0, y: 0, width: size.width, height: 32)),
                     with: .linearGradient(Gradient(colors: [color.opacity(0.14), .clear]), startPoint: .zero, endPoint: CGPoint(x: 0, y: 32)))
            var grid = Path()
            var x: CGFloat = 0
            while x < size.width {
                grid.move(to: CGPoint(x: x, y: 0))
                grid.addLine(to: CGPoint(x: x, y: 32))
                x += 18
            }
            ctx.stroke(grid, with: .color(color.opacity(0.07)), lineWidth: 1)
        }
    }
}

// MARK: - ticker (footer)

struct ChatTickerView: View {
    @ObservedObject var hud: ChatHUD
    @ObservedObject var theme = ThemeStore.shared

    var body: some View {
        TimelineView(.periodic(from: .now, by: hud.visible ? 1 : 3600)) { tl in
            let blinkOff = Int(tl.date.timeIntervalSinceReferenceDate) % 2 == 0
            let status = hud.status
            let color = Color(hex: Theme.statusHex[status] ?? Theme.endedHex)
            HStack(spacing: 10) {
                Text(statusText(status))
                    .font(.mono(10.5, .semibold))
                    .foregroundColor(color)
                    .shadow(color: color.opacity(0.6), radius: 6)
                    .opacity(status == "waiting" && blinkOff ? 0.35 : 1)
                    .lineLimit(1)
                Spacer(minLength: 8)
                HStack(spacing: 6) {
                    ForEach(hud.chips) { chip in
                        ChipView(chip: chip, now: tl.date)
                            .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
                    }
                }
            }
            .padding(.horizontal, 12)
            .frame(maxHeight: .infinity)
        }
        .frame(height: 26)
        .background(Color.black.opacity(0.2))
        .overlay(alignment: .top) { Rectangle().fill(Color(hex: Theme.statusHex[hud.status] ?? Theme.endedHex, opacity: 0.3)).frame(height: 1) }
    }

    private func statusText(_ status: String) -> String {
        switch status {
        case "busy": return "● working"
        case "idle": return "◆ your turn"
        case "waiting": return "⚠ NEEDS YOU" + (hud.brief?.waitingFor.map { " · \($0)" } ?? "")
        case "terminal": return "▸ terminal · claude to start · claude -r to resume"
        case "starting": return "◌ starting claude…"
        default: return "○ ended · close the window to remove it"
        }
    }
}

private struct ChipView: View {
    let chip: TickerChip
    let now: Date

    var body: some View {
        let color = Color(hex: chip.hex)
        let fresh = now.timeIntervalSince(chip.at) < 1.4
        HStack(spacing: 5) {
            Text(chip.tag).foregroundColor(color).fontWeight(.bold)
            Text(chip.text).foregroundColor(Theme.cText)
        }
        .font(.mono(9.5))
        .lineLimit(1)
        .padding(.horizontal, 7)
        .padding(.vertical, 1)
        .frame(maxWidth: 230)
        .background(fresh ? color.opacity(0.18) : Color.clear)
        .overlay(Rectangle().stroke(color, lineWidth: 1))
        .shadow(color: fresh ? color : .clear, radius: 6)
    }
}

// MARK: - neon border, flash, beam

/// Rotating conic-gradient edge around the window; colour and speed follow the session status.
final class NeonBorderView: NSView {
    private let ring = CALayer()
    private let gradient = CAGradientLayer()
    private let ringMask = CAShapeLayer()
    private let glow = CAShapeLayer()
    private var current = ""

    override init(frame: NSRect) {
        super.init(frame: frame)
        layer = CALayer()
        wantsLayer = true
        layer!.addSublayer(glow)
        ring.mask = ringMask
        ring.addSublayer(gradient)
        layer!.addSublayer(ring)
        gradient.type = .conic
        gradient.startPoint = CGPoint(x: 0.5, y: 0.5)
        gradient.endPoint = CGPoint(x: 0.5, y: 0)
        ringMask.fillColor = nil
        ringMask.strokeColor = NSColor.black.cgColor
        ringMask.lineWidth = 2.5
        glow.fillColor = nil
        glow.lineWidth = 1
        glow.shadowOffset = .zero
        glow.shadowRadius = 9
        glow.shadowOpacity = 0.8
        setStatus("starting")
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func hitTest(_ point: NSPoint) -> NSView? { nil }

    override func layout() {
        super.layout()
        relayout()
    }

    override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        relayout()
    }

    private func relayout() {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let b = bounds
        ring.frame = b
        ringMask.frame = b
        glow.frame = b
        let d = hypot(b.width, b.height) * 1.05
        gradient.bounds = CGRect(x: 0, y: 0, width: d, height: d)
        gradient.position = CGPoint(x: b.midX, y: b.midY)
        let path = CGPath(roundedRect: b.insetBy(dx: 1.25, dy: 1.25), cornerWidth: 12, cornerHeight: 12, transform: nil)
        ringMask.path = path
        glow.path = path
        glow.shadowPath = path.copy(strokingWithWidth: 2, lineCap: .round, lineJoin: .round, miterLimit: 1)
        CATransaction.commit()
    }

    func setStatus(_ status: String) {
        // Waiting on the user looks like the turn it's in: the corner's notice says it (WaitNotifier), not the border.
        let status = status == "waiting" ? "busy" : status
        guard status != current else { return }
        current = status
        var colors: [UInt32]
        var spin: Double
        var glowHex: UInt32
        let h = { (token: String) in ThemeStore.shared.hex(token) }
        switch status {
        case "busy": colors = [h("--accent"), h("--amber"), h("--warn"), h("--accent")]; spin = 3.2; glowHex = h("--accent")
        case "idle", "terminal": colors = [h("--cyan"), h("--idle-deep"), h("--violet"), h("--cyan")]; spin = 9; glowHex = h("--cyan")
        default: colors = [h("--dim2"), h("--ended-deep"), h("--dim2")]; spin = 0; glowHex = h("--dim2")
        }
        gradient.colors = colors.map { NSColor(hex: $0).cgColor }
        gradient.removeAnimation(forKey: "spin")
        if spin > 0 {
            let a = CABasicAnimation(keyPath: "transform.rotation.z")
            a.fromValue = 0
            a.toValue = -2 * Double.pi
            a.duration = spin
            a.repeatCount = .infinity
            gradient.add(a, forKey: "spin")
        }
        glow.strokeColor = NSColor(hex: glowHex, alpha: 0.5).cgColor
        glow.shadowColor = NSColor(hex: glowHex).cgColor
        glow.removeAnimation(forKey: "pulse")
        let p = CABasicAnimation(keyPath: "shadowOpacity")
        p.fromValue = 0.2
        p.toValue = 0.95
        p.duration = 1.6
        p.autoreverses = true
        p.repeatCount = .infinity
        glow.add(p, forKey: "pulse")
    }

    /// The theme changed: the same status in its colours.
    func repaint() {
        let status = current
        current = ""
        setStatus(status)
    }
}

/// White sheet over the content; brightens the picture while the old-TV effect runs.
final class FlashView: NSView {
    override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layer?.backgroundColor = NSColor(hex: 0xFFF3E0).cgColor
        layer?.opacity = 0
    }

    required init?(coder: NSCoder) { fatalError("not used") }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }
}

/// The glowing horizontal line and the last dot of the old-TV effect, drawn above the squeezed content.
final class BeamView: NSView {
    let line = CAGradientLayer()
    let dot = CALayer()

    override init(frame: NSRect) {
        super.init(frame: frame)
        layer = CALayer()
        wantsLayer = true
        line.startPoint = CGPoint(x: 0, y: 0.5)
        line.endPoint = CGPoint(x: 1, y: 0.5)
        line.shadowRadius = 10
        line.shadowOpacity = 1
        line.shadowOffset = .zero
        line.opacity = 0
        dot.backgroundColor = NSColor.white.cgColor
        dot.cornerRadius = 4
        dot.shadowRadius = 14
        dot.shadowOpacity = 1
        dot.shadowOffset = .zero
        dot.opacity = 0
        layer!.addSublayer(line)
        layer!.addSublayer(dot)
        paint()
    }

    /// The theme's accent (again when the theme changes).
    func paint() {
        let accent = Theme.accentHex, pale = ThemeStore.shared.hex("--accent-pale")
        line.colors = [NSColor(hex: accent, alpha: 0).cgColor, NSColor(hex: pale).cgColor, NSColor.white.cgColor,
                       NSColor(hex: pale).cgColor, NSColor(hex: accent, alpha: 0).cgColor]
        line.shadowColor = NSColor(hex: accent).cgColor
        dot.shadowColor = ThemeStore.shared.color("--accent-soft").cgColor
    }

    required init?(coder: NSCoder) { fatalError("not used") }
    override func hitTest(_ point: NSPoint) -> NSView? { nil }

    override func layout() {
        super.layout()
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        line.frame = CGRect(x: 0, y: bounds.midY - 1.5, width: bounds.width, height: 3)
        dot.frame = CGRect(x: bounds.midX - 4, y: bounds.midY - 4, width: 8, height: 8)
        CATransaction.commit()
    }
}

// MARK: - chat window

/// The header is the window's title bar, so a double-click on its title row does what a double-click on any title
/// bar does (System Settings → Desktop & Dock): fill the screen and back, minimize, or nothing.
private final class HeaderHostingView<Content: View>: NSHostingView<Content> {
    /// Like a title bar's buttons, the header's work on the first click, while another window is in front too.
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }

    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        let fromTop = isFlipped ? p.y : bounds.height - p.y
        if event.clickCount == 2, fromTop < 32, let w = window {
            switch UserDefaults.standard.string(forKey: "AppleActionOnDoubleClick") {
            case "Minimize": w.miniaturize(nil)
            case "None": break
            default: w.zoom(nil)
            }
            return
        }
        super.mouseDown(with: event)
    }
}

@MainActor
final class ChatWindowController: NSWindowController, NSWindowDelegate, LocalProcessTerminalViewDelegate {
    let id = UUID().uuidString
    let cwd: String
    var sessionId: String?
    /// The detached session this window shows; Claude runs there, not under the app. Nil only when screen
    /// couldn't start it, and the chat then runs in the window itself.
    private(set) var detached: DetachedLink?
    /// A copy's original in iTerm2; it ends with this chat.
    var origin: ITermOrigin?
    private(set) var terminal: ChatTerminalView!
    let hud: ChatHUD
    weak var manager: MainWindowController?
    private(set) var isShown = false
    private var animating = false
    private var hiding = false
    private var reopenAfterHide = false
    private let container = NSView()
    private let border = NeonBorderView()
    private let flash = FlashView()
    private let beam = BeamView()
    /// How much is selected, and what ⌘C copied, in small type at the terminal's bottom-right, as Claude Code shows it.
    private let selectionBadge = NSTextField(labelWithString: "")
    /// The glass's tint: the terminal's background, a little warmer (the accent) at the top left.
    private let warmTint = CAGradientLayer()
    /// The window's see-through background (windowOpacity), a view of its own under everything: the CRT effect squeezes
    /// the container's sublayers, not its own background, which stayed full size while the window powered off.
    private let backdrop = NSView()
    /// What glows with a neon theme: the header, the footer and the terminals' area (ThemeStore.glow).
    private var glowing: [NSView] = []
    private var themeWatch: NSObjectProtocol?
    private var copiedUntil = Date.distantPast
    /// Out of the way while the dashboard shows a menu (see stepAside).
    private var steppedAside = false
    /// iTerm2's tabs and split panes (Panes.swift): where the shown tab goes, its tab bar, each tab's root view (a
    /// terminal, or split views of them), and the panes besides this window's own terminal.
    private let paneArea = NSView()
    private let tabBar = PaneTabBar()
    private var tabs: [NSView] = []
    private var activeTab = 0
    private(set) var extras: [ExtraPane] = []
    private var paneTop: NSLayoutConstraint!
    private var paneTopUnderTabs: NSLayoutConstraint!
    /// ⇧⌘↩: only the pane in front shows in its tab.
    private var zoomed = false
    /// Terminals in the order they had the keyboard, the latest last (a tab shown again gives it back to its latest).
    private var focusHistory: [ChatTerminalView] = []
    /// A tab being dragged by its chip, and the orange area that shows where it would go (iTerm2's drag to split).
    private var draggedTab: Int?
    private let dropZone = NSView()
    private var focusWatch: NSKeyValueObservation?

    /// `claudeArgs` nil opens a plain terminal in `cwd`.
    init(cwd: String, claudeArgs: [String]?, sessionId: String?, title: String, fontSize: CGFloat, frame: NSRect,
         manager: MainWindowController, detached: DetachedLink? = nil, mirror: Bool = false) {
        self.cwd = cwd
        self.sessionId = sessionId
        self.detached = detached
        self.hud = ChatHUD(terminalDir: claudeArgs == nil ? cwd : nil)
        hud.mirror = mirror
        self.manager = manager
        let w = NSWindow(contentRect: frame, styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                         backing: .buffered, defer: false)
        w.title = title
        w.titlebarAppearsTransparent = true
        w.titleVisibility = .hidden
        w.isOpaque = false
        w.backgroundColor = .clear
        w.hasShadow = true
        w.appearance = NSAppearance(named: .darkAqua)
        w.tabbingMode = .disallowed
        // Opens over a full-screen dashboard in the same Space instead of switching to the desktop.
        w.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
        w.minSize = NSSize(width: 640, height: 420)
        w.isReleasedWhenClosed = false
        super.init(window: w)
        w.delegate = self
        if detached != nil {
            terminal = TerminalFactory.makeIdle(chatId: id, fontSize: fontSize, delegate: self)
        } else {
            terminal = TerminalFactory.make(chatId: id, cwd: cwd, claudeArgs: claudeArgs, fontSize: fontSize, delegate: self)
        }
        terminal.sessionShell = { [weak self] in self?.detached?.shellPid ?? 0 }
        terminal.workingDirectory = { [weak self] in self?.cwd }
        terminal.onSelection = { [weak self] text in self?.showSelection(text) }
        terminal.onCopy = { [weak self] text in self?.showCopied(text) }
        terminal.onFocus = { [weak self] in self?.focusChanged() }
        buildLayout()
        paintTheme()
        themeWatch = NotificationCenter.default.addObserver(forName: ThemeStore.changed, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.themeChanged() }
        }
        focusWatch = w.observe(\.firstResponder) { [weak self] _, _ in
            MainActor.assumeIsolated { self?.focusChanged() }
        }
        // GPU text rendering: glyphs come from an atlas and cells are drawn as quads, far less CPU than
        // Core Graphics when Claude streams output. Falls back to Core Graphics if Metal can't start.
        try? terminal.setUseMetal(true)
        // Until the window is shown there is nothing to draw.
        terminal.suspendsRenderingWhenNotVisible = true
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    /// screen couldn't start the session: run the chat in this window instead (it then ends with the app).
    func runLocally(claudeArgs: [String]?) {
        guard detached != nil, !attached else { return }
        detached = nil
        attached = true
        TerminalFactory.start(terminal, cwd: cwd, claudeArgs: claudeArgs)
        manager?.chatProcessEnded(id)
    }

    deinit {
        if let themeWatch { NotificationCenter.default.removeObserver(themeWatch) }
    }

    /// The theme's colours on what the window draws itself.
    /// How much of what's behind shows through the window, terminals included: plainly, no frost (a blur over it read as
    /// a frosted pane, not a see-through terminal). 90% opaque keeps the text easy to read.
    static let windowOpacity: CGFloat = 0.9

    private func paintTheme() {
        for v in glowing { ThemeStore.glow(v, on: ThemeStore.shared.glows) }
        let bg = Theme.terminalBg
        backdrop.wantsLayer = true
        backdrop.layer?.backgroundColor = bg.withAlphaComponent(Self.windowOpacity).cgColor
        warmTint.colors = zip([bg.blended(withFraction: 0.12, of: Theme.accent) ?? bg, bg, bg], [0.3, 0.22, 0.3] as [CGFloat])
            .map { $0.withAlphaComponent($1).cgColor }
        selectionBadge.textColor = Theme.accent
        dropZone.layer?.backgroundColor = NSColor(hex: Theme.accentHex, alpha: 0.2).cgColor
        dropZone.layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: 0.9).cgColor
    }

    /// Another theme (the theme screen): the window, its terminals, tabs and split lines take its colours at once.
    private func themeChanged() {
        paintTheme()
        border.repaint()
        beam.paint()
        for tv in allTerminals { TerminalFactory.paint(tv) }
        if tabs.count > 1 { tabBar.show(titles: tabs.indices.map(tabTitle), active: activeTab) }
        func redraw(_ v: NSView) { v.needsDisplay = true; v.subviews.forEach(redraw) }
        redraw(paneArea)
    }

    private func buildLayout() {
        guard let w = window else { return }
        let root = NSView()
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor.clear.cgColor
        w.contentView = root

        container.wantsLayer = true
        container.layer?.cornerRadius = 12
        container.layer?.masksToBounds = true

        let tint = NSView()
        let warm = warmTint
        warm.startPoint = CGPoint(x: 0, y: 1)
        warm.endPoint = CGPoint(x: 1, y: 0)
        let sheen = CAGradientLayer()
        sheen.colors = [NSColor.white.withAlphaComponent(0.08).cgColor, NSColor.white.withAlphaComponent(0).cgColor]
        sheen.startPoint = CGPoint(x: 0, y: 1)
        sheen.endPoint = CGPoint(x: 0.35, y: 0.6)
        tint.layer = CALayer()
        tint.wantsLayer = true
        tint.layer?.addSublayer(warm)
        tint.layer?.addSublayer(sheen)
        tint.postsFrameChangedNotifications = true
        NotificationCenter.default.addObserver(forName: NSView.frameDidChangeNotification, object: tint, queue: .main) { [weak tint] _ in
            guard let tint else { return }
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            warm.frame = tint.bounds
            sheen.frame = tint.bounds
            CATransaction.commit()
        }

        let header = HeaderHostingView(rootView: ChatHeaderView(
            hud: hud,
            onTogglePin: { [weak self] in self?.togglePin() },
            onDashboard: { [weak self] in self?.manager?.showDashboard() },
            onEnd: { [weak self] in self?.endChat() },
            onCopyReply: { [weak self] in self?.copyLastReply() }))
        let ticker = NSHostingView(rootView: ChatTickerView(hud: hud))
        glowing = [header, ticker, paneArea, tabBar]

        for v in [container, beam] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(v)
            pin(v, to: root)
        }
        selectionBadge.font = Theme.mono(10.5, .semibold)
        selectionBadge.drawsBackground = true
        selectionBadge.backgroundColor = NSColor.black.withAlphaComponent(0.55)
        selectionBadge.isHidden = true
        tabBar.isHidden = true
        tabBar.onSelect = { [weak self] in self?.selectTab($0) }
        tabBar.onClose = { [weak self] in self?.closeTab($0) }
        tabBar.onDrag = { [weak self] in self?.dragTab($0, $1) }
        for v in [backdrop, tint, header, tabBar, paneArea, ticker, selectionBadge, border, flash] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(v)
        }
        dropZone.wantsLayer = true
        dropZone.layer?.borderWidth = 2
        dropZone.layer?.cornerRadius = 6
        dropZone.isHidden = true
        container.addSubview(dropZone)
        tabs = [terminal]
        mount(terminal)
        paneTop = paneArea.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 6)
        paneTopUnderTabs = paneArea.topAnchor.constraint(equalTo: tabBar.bottomAnchor, constant: 5)
        for v in [backdrop, tint, border, flash] as [NSView] { pin(v, to: container) }
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: container.topAnchor),
            header.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            header.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            header.heightAnchor.constraint(equalToConstant: 62),
            ticker.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            ticker.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            ticker.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            ticker.heightAnchor.constraint(equalToConstant: 26),
            tabBar.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 4),
            tabBar.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),
            tabBar.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -10),
            tabBar.heightAnchor.constraint(equalToConstant: 24),
            paneTop,
            paneArea.bottomAnchor.constraint(equalTo: ticker.topAnchor, constant: -4),
            paneArea.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),
            paneArea.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -6),
            selectionBadge.trailingAnchor.constraint(equalTo: paneArea.trailingAnchor, constant: -10),
            selectionBadge.bottomAnchor.constraint(equalTo: paneArea.bottomAnchor, constant: -6),
        ])
    }

    private static func lineCount(_ text: String) -> Int {
        let lines = text.split(separator: "\n", omittingEmptySubsequences: false)
        return max(1, lines.count - (text.hasSuffix("\n") ? 1 : 0))
    }

    private func showSelection(_ text: String?) {
        guard Date() >= copiedUntil else { return }
        guard let text, !text.isEmpty else { return selectionBadge.isHidden = true }
        let n = Self.lineCount(text)
        selectionBadge.stringValue = n == 1 ? " 1 line selected · \(text.count) chars " : " \(n) lines selected "
        selectionBadge.isHidden = false
    }

    /// Claude's last reply onto the clipboard, the whole of it, from the conversation's transcript (LastReply): on the
    /// terminal, Claude's full-screen view only lets a reply be selected as far as it fits the window.
    func copyLastReply() {
        guard let sid = sessionId, let text = LastReply.text(sessionId: sid) else { return NSSound.beep() }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        showCopied(text)
    }

    private func showCopied(_ text: String) {
        let n = Self.lineCount(text)
        selectionBadge.stringValue = n == 1 ? " copied 1 line " : " copied \(n) lines "
        selectionBadge.isHidden = false
        copiedUntil = Date().addingTimeInterval(2.5)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.6) { [weak self] in
            guard let self else { return }
            self.showSelection(self.terminal.getSelection())
        }
    }

    private func pin(_ v: NSView, to p: NSView) {
        NSLayoutConstraint.activate([
            v.topAnchor.constraint(equalTo: p.topAnchor),
            v.bottomAnchor.constraint(equalTo: p.bottomAnchor),
            v.leadingAnchor.constraint(equalTo: p.leadingAnchor),
            v.trailingAnchor.constraint(equalTo: p.trailingAnchor),
        ])
    }

    // MARK: show / hide with the old-TV effect

    func show() {
        guard let w = window else { return }
        if hiding {
            reopenAfterHide = true
            return
        }
        // A card can be clicked while this window is still considered shown but was ordered out for a dashboard modal,
        // or while another app owns the foreground. Reclaim and repin it before ordering it front; otherwise the click
        // reaches openSession successfully yet appears to do nothing.
        steppedAside = false
        if hud.attached, let parent = manager?.window, parent.isVisible, w.parent != parent {
            w.parent?.removeChildWindow(w)
            parent.addChildWindow(w, ordered: .above)
        }
        NSApp.activate(ignoringOtherApps: true)
        if isShown {
            w.makeKeyAndOrderFront(nil)
            focus(focusTarget(in: activeTab))
            return
        }
        isShown = true
        hud.visible = true
        for tv in allTerminals { tv.suspendsRenderingWhenNotVisible = false }
        // A window that attached while hidden takes over the session size now.
        fitSession()
        extras.forEach { $0.fit() }
        if hud.attached, let parent = manager?.window, parent.isVisible { parent.addChildWindow(w, ordered: .above) }
        w.layoutIfNeeded()
        setButtonsHidden(true)
        container.layer?.sublayerTransform = squeeze(0.003, 0.003)
        w.makeKeyAndOrderFront(nil)
        focus(focusTarget(in: activeTab))
        runPowerOn()
        manager?.chatVisibilityChanged()
    }

    /// Powers the window off and orders it out; false when it can't (hidden already, or still animating).
    @discardableResult
    func hide(then: (() -> Void)? = nil) -> Bool {
        guard let w = window, isShown, !animating else { return false }
        hiding = true
        runPowerOff { [weak self] in
            guard let self else { return }
            self.hiding = false
            w.parent?.removeChildWindow(w)
            w.orderOut(nil)
            self.isShown = false
            // Nothing to draw while hidden; SwiftTerm resumes when the window is shown again.
            self.hud.visible = false
            for tv in self.allTerminals { tv.suspendsRenderingWhenNotVisible = true }
            self.resetEffect()
            self.manager?.chatVisibilityChanged()
            let reopen = self.reopenAfterHide
            self.reopenAfterHide = false
            then?()
            // A destructive close owns its completion. Only a normal hide may be reversed by a card click.
            if reopen, then == nil { self.show() }
        }
        return true
    }

    private func squeeze(_ sx: CGFloat, _ sy: CGFloat) -> CATransform3D {
        let b = container.bounds
        var t = CATransform3DMakeTranslation(b.midX, b.midY, 0)
        t = CATransform3DScale(t, sx, sy, 1)
        return CATransform3DTranslate(t, -b.midX, -b.midY, 0)
    }

    private func setButtonsHidden(_ hidden: Bool) {
        for kind in [NSWindow.ButtonType.closeButton, .miniaturizeButton, .zoomButton] {
            window?.standardWindowButton(kind)?.isHidden = hidden
        }
    }

    private func keyframes(_ path: String, _ values: [Any], _ times: [NSNumber], _ duration: Double, _ timing: CAMediaTimingFunctionName) -> CAKeyframeAnimation {
        let a = CAKeyframeAnimation(keyPath: path)
        a.values = values
        a.keyTimes = times
        a.duration = duration
        a.timingFunction = CAMediaTimingFunction(name: timing)
        a.fillMode = .forwards
        a.isRemovedOnCompletion = false
        return a
    }

    private func runPowerOn() {
        animating = true
        let d = 0.7
        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            guard let self else { return }
            self.resetEffect()
            self.animating = false
            self.window?.invalidateShadow()
        }
        let t: [CATransform3D] = [squeeze(0.003, 0.003), squeeze(0.03, 0.003), squeeze(1, 0.006), squeeze(1, 1.035), squeeze(1, 0.988), squeeze(1, 1)]
        container.layer?.add(keyframes("sublayerTransform", t.map { NSValue(caTransform3D: $0) }, [0, 0.1, 0.36, 0.62, 0.78, 1], d, .easeOut), forKey: "crt")
        flash.layer?.add(keyframes("opacity", [0.95, 0.95, 0.85, 0.35, 0.1, 0], [0, 0.1, 0.36, 0.62, 0.78, 1], d, .easeOut), forKey: "crt")
        beam.line.add(keyframes("transform.scale.x", [0.003, 0.03, 1, 1], [0, 0.1, 0.36, 1], d, .easeOut), forKey: "crt")
        beam.line.add(keyframes("opacity", [1, 1, 1, 0, 0], [0, 0.1, 0.36, 0.55, 1], d, .easeOut), forKey: "crt-o")
        CATransaction.commit()
    }

    private func runPowerOff(_ done: @escaping () -> Void) {
        animating = true
        setButtonsHidden(true)
        let d = 0.55
        CATransaction.begin()
        CATransaction.setCompletionBlock { [weak self] in
            self?.animating = false
            done()
        }
        let t: [CATransform3D] = [squeeze(1, 1), squeeze(1, 0.006), squeeze(0.004, 0.004), squeeze(0.0001, 0.002)]
        container.layer?.add(keyframes("sublayerTransform", t.map { NSValue(caTransform3D: $0) }, [0, 0.38, 0.7, 1], d, .easeIn), forKey: "crt")
        flash.layer?.add(keyframes("opacity", [0, 0.9, 1, 1], [0, 0.38, 0.7, 1], d, .easeIn), forKey: "crt")
        beam.line.add(keyframes("transform.scale.x", [1, 1, 0.004, 0.0001], [0, 0.38, 0.7, 1], d, .easeIn), forKey: "crt")
        beam.line.add(keyframes("opacity", [0, 0.9, 1, 0], [0, 0.38, 0.7, 1], d, .easeIn), forKey: "crt-o")
        beam.dot.add(keyframes("opacity", [0, 0, 1, 0.6], [0, 0.6, 0.75, 1], d, .easeOut), forKey: "crt")
        CATransaction.commit()
    }

    private func resetEffect() {
        container.layer?.removeAnimation(forKey: "crt")
        container.layer?.sublayerTransform = CATransform3DIdentity
        flash.layer?.removeAnimation(forKey: "crt")
        beam.line.removeAllAnimations()
        beam.dot.removeAllAnimations()
        setButtonsHidden(false)
    }

    // MARK: actions

    /// The pin: on top of every app's windows (Discord, Chrome…), on any desktop. A window rides above the dashboard
    /// by default, as its child, and goes behind other apps with it; pinned, it leaves the dashboard (a child takes
    /// its parent's level, and can't leave a full-screen dashboard's Space) and floats. Unpinned, it rides on the
    /// dashboard again.
    func togglePin() {
        guard let w = window else { return }
        hud.onTop.toggle()
        hud.attached = !hud.onTop
        if hud.onTop {
            w.parent?.removeChildWindow(w)
            w.collectionBehavior = [.managed, .participatesInCycle]
            w.level = .floating
            if isShown {
                // Ordered in again, it goes where an ordinary window may be: off a full-screen dashboard's Space.
                w.orderOut(nil)
                w.makeKeyAndOrderFront(nil)
            }
        } else {
            w.level = .normal
            w.collectionBehavior = [.fullScreenAuxiliary, .moveToActiveSpace]
            if let parent = manager?.window, parent.isVisible { parent.addChildWindow(w, ordered: .above) }
        }
    }

    // MARK: tiling (Fn+Control+arrows, like macOS)

    enum Tile { case left, right, top, bottom, topLeft, topRight, bottomLeft, bottomRight, fill }
    private var tile: Tile?
    private var tiledFrame: NSRect?
    private var untiledFrame: NSRect?

    /// macOS tiles windows with Fn+Control and the arrows (F fills, C centres, R returns), but not a window pinned
    /// above the dashboard (a child window), so the app does it for its chat windows. A second arrow makes a quarter:
    /// left then up is the top-left quarter.
    func tile(key: UInt16) {
        guard let w = window, let screen = (w.screen ?? NSScreen.main)?.visibleFrame else { return }
        if let tiledFrame, w.frame != tiledFrame { tile = nil }
        let t = tile
        let next: Tile?
        switch key {
        case 123, 115: next = [.top, .topLeft, .topRight].contains(t) ? .topLeft : [.bottom, .bottomLeft, .bottomRight].contains(t) ? .bottomLeft : .left
        case 124, 119: next = [.top, .topLeft, .topRight].contains(t) ? .topRight : [.bottom, .bottomLeft, .bottomRight].contains(t) ? .bottomRight : .right
        case 126, 116: next = [.left, .topLeft, .bottomLeft].contains(t) ? .topLeft : [.right, .topRight, .bottomRight].contains(t) ? .topRight : .top
        case 125, 121: next = [.left, .topLeft, .bottomLeft].contains(t) ? .bottomLeft : [.right, .topRight, .bottomRight].contains(t) ? .bottomRight : .bottom
        case 3: next = .fill
        case 8:
            var f = w.frame
            f.origin = NSPoint(x: screen.midX - f.width / 2, y: screen.midY - f.height / 2)
            return place(f, as: nil)
        case 15:
            guard let back = untiledFrame else { return }
            untiledFrame = nil
            return place(back, as: nil)
        default: return
        }
        guard let next else { return }
        let gap: CGFloat = 8
        let s = screen.insetBy(dx: gap / 2, dy: gap / 2)
        let halfW = s.width / 2, halfH = s.height / 2
        let r: NSRect
        switch next {
        case .left: r = NSRect(x: s.minX, y: s.minY, width: halfW, height: s.height)
        case .right: r = NSRect(x: s.midX, y: s.minY, width: halfW, height: s.height)
        case .top: r = NSRect(x: s.minX, y: s.midY, width: s.width, height: halfH)
        case .bottom: r = NSRect(x: s.minX, y: s.minY, width: s.width, height: halfH)
        case .topLeft: r = NSRect(x: s.minX, y: s.midY, width: halfW, height: halfH)
        case .topRight: r = NSRect(x: s.midX, y: s.midY, width: halfW, height: halfH)
        case .bottomLeft: r = NSRect(x: s.minX, y: s.minY, width: halfW, height: halfH)
        case .bottomRight: r = NSRect(x: s.midX, y: s.minY, width: halfW, height: halfH)
        case .fill: r = s
        }
        if tile == nil { untiledFrame = w.frame }
        place(r.insetBy(dx: gap / 2, dy: gap / 2), as: next)
    }

    private func place(_ frame: NSRect, as t: Tile?) {
        guard let w = window else { return }
        tile = t
        tiledFrame = t == nil ? nil : frame
        w.setFrame(frame, display: true, animate: true)
        fitSession()
    }

    // MARK: iTerm2's split and pane shortcuts (MainWindowController.split and the rest)

    /// ⇧⌘↩ with a single pane: the window fills the screen, and back.
    func toggleMaximize() {
        if tile == .fill, window?.frame == tiledFrame, untiledFrame != nil { tile(key: 15) } else { tile(key: 3) }
    }

    // MARK: tabs and split panes (iTerm2's ⌘T, ⌘D, ⇧⌘D, ⌘[ ⌘], ⌥⌘ arrows, ⇧⌘[ ⇧⌘], ⌃⌘ arrows, ⇧⌘↩, ⌘W)

    /// Every terminal in this window: its own first, then the extra panes.
    private var allTerminals: [ChatTerminalView] { [terminal] + extras.map(\.terminal) }

    /// The shells of every pane (the dashboard maps them to this window).
    var shellPids: [Int32] { [shellPid] + extras.map(\.shellPid) }

    private func extra(of tv: ChatTerminalView) -> ExtraPane? { extras.first { $0.terminal === tv } }

    /// The car of the window's own terminal on the orbit. Cars go by their session's name, which stays the same while it
    /// lives: a tab closed into a car, and a car opened into a window of its own, keep the car they had.
    var carId: String { "s:" + (detached?.name ?? id) }

    /// The window's terminals with no Claude in them, for the orbit's cars: its own when it's a terminal, and every tab
    /// and split pane besides (a dev server in the tab next to a chat).
    func plainShells() -> [(id: String, shell: Int32, cwd: String)] {
        var out: [(id: String, shell: Int32, cwd: String)] = []
        if hud.status == "terminal", let shell = detached?.shellPid { out.append((carId, shell, hud.terminalDir ?? cwd)) }
        for pane in extras {
            let shell = pane.shellPid
            // An AI in a pane (Claude, Codex…) is a session on the orbit, not a car.
            guard shell > 0, !Self.runsAgent(shell) else { continue }
            out.append(("s:" + paneKey(pane), shell, pane.cwd))
        }
        return out
    }

    /// The pane whose car is `id`, its own or a tab's or split's, when it's in this window.
    private func terminal(forCar id: String) -> ChatTerminalView? {
        if id == carId { return terminal }
        return extras.first { "s:" + paneKey($0) == id }?.terminal
    }

    func hasCar(_ id: String) -> Bool { terminal(forCar: id) != nil }

    private func paneKey(_ pane: ExtraPane) -> String { pane.link?.name ?? "pid\(pane.shellPid)" }

    static func runsClaude(_ shell: Int32) -> Bool { runs(shell, Proc.isClaude) }

    /// Claude or another AI tool (Proc.otherAIs) in the shell: a session on the orbit.
    static func runsAgent(_ shell: Int32) -> Bool { runs(shell) { Proc.isClaude($0) || Proc.otherAI($0) != nil } }

    private static func runs(_ shell: Int32, _ match: (Int32) -> Bool) -> Bool {
        var level = Proc.children(of: shell)
        for _ in 0..<4 where !level.isEmpty {
            if level.contains(where: match) { return true }
            level = level.flatMap { Proc.children(of: $0) }
        }
        return false
    }

    /// The orbit opened this window for one of its cars: that pane's tab comes to the front and the keyboard goes to it,
    /// so a window split five ways opens on the pane that was clicked.
    func focusCar(_ id: String) {
        if let tv = terminal(forCar: id) { reveal(tv) }
    }

    /// The same for the pane a process runs in (a Claude session clicked on the orbit): the one whose shell it's under.
    func focusPane(hosting pid: Int32) {
        var cur = pid
        for _ in 0..<8 {
            if cur == shellPid { return reveal(terminal) }
            if let pane = extras.first(where: { $0.shellPid == cur }) { return reveal(pane.terminal) }
            guard let parent = Proc.parent(cur), parent > 1 else { return }
            cur = parent
        }
    }

    private func reveal(_ tv: ChatTerminalView) {
        if zoomed, tv !== focusedTerminal { _ = toggleZoom() }
        if let t = tabs.indices.first(where: { i in terminals(in: i).contains { $0 === tv } }), t != activeTab { selectTab(t) }
        focus(tv)
    }

    /// The pane with the keyboard, else the one used last in the shown tab.
    var focusedTerminal: ChatTerminalView {
        if let tv = window?.firstResponder as? ChatTerminalView, allTerminals.contains(where: { $0 === tv }) { return tv }
        return focusTarget(in: activeTab)
    }

    /// The shell in the pane the user interacted with last, for selecting that pane's AI in the dashboard top bar.
    var focusedShellPid: Int32 {
        let tv = focusedTerminal
        if tv === terminal { return shellPid }
        return extra(of: tv)?.shellPid ?? 0
    }

    private func focusTarget(in tab: Int) -> ChatTerminalView {
        let ts = terminals(in: tab)
        return focusHistory.last { t in ts.contains { $0 === t } } ?? ts.first ?? terminal
    }

    /// Where a new terminal "here" opens: the folder the shell of the pane in front is in now (it may have cd'd).
    var currentFolder: String {
        if let pane = extra(of: focusedTerminal) { return pane.currentFolder }
        return (shellPid > 0 ? Proc.cwd(shellPid) : nil) ?? cwd
    }

    /// Tab `i`'s terminals, left to right and top to bottom.
    private func terminals(in i: Int) -> [ChatTerminalView] {
        guard tabs.indices.contains(i) else { return [] }
        func walk(_ v: NSView) -> [ChatTerminalView] {
            if let tv = v as? ChatTerminalView { return [tv] }
            return (v as? PaneSplitView)?.arrangedSubviews.flatMap(walk) ?? []
        }
        return walk(tabs[i])
    }

    /// The shown tab's root fills the pane area.
    private func mount(_ v: NSView) {
        v.removeFromSuperview()
        v.translatesAutoresizingMaskIntoConstraints = false
        paneArea.addSubview(v)
        pin(v, to: paneArea)
    }

    private func makeExtra(kind: PaneKind, cwd: String) -> ExtraPane {
        let pane = ExtraPane(owner: self, cwd: cwd, kind: kind, fontSize: terminal.font.pointSize)
        pane.terminal.sessionShell = { [weak pane] in pane?.link?.shellPid ?? 0 }
        pane.terminal.workingDirectory = { [weak pane] in pane?.cwd }
        pane.terminal.onSelection = { [weak self] in self?.showSelection($0) }
        pane.terminal.onCopy = { [weak self] in self?.showCopied($0) }
        pane.terminal.onFocus = { [weak self] in self?.focusChanged() }
        pane.terminal.suspendsRenderingWhenNotVisible = !isShown
        extras.append(pane)
        return pane
    }

    /// ⌘T: a new tab with a shell in the folder of the pane in front. In a mirror too (a chat the other app runs): the
    /// tab's shell is this app's own.
    func newTab() {
        let pane = makeExtra(kind: .tab, cwd: currentFolder)
        tabs.append(pane.terminal)
        selectTab(tabs.count - 1)
        pane.start(session: nil, parent: detached?.name, fit: isShown)
        focus(pane.terminal)
    }

    /// ⌘D (`vertical`: side by side) / ⇧⌘D (one above the other): the pane in front gives half its place to a shell in
    /// its folder.
    func split(vertical: Bool) {
        if zoomed { _ = toggleZoom() }
        let old = focusedTerminal
        let pane = makeExtra(kind: vertical ? .vertical : .horizontal, cwd: currentFolder)
        insert(pane.terminal, beside: old, vertical: vertical)
        refreshPanes()
        focus(pane.terminal)
        pane.start(session: nil, parent: detached?.name, fit: isShown)
    }

    /// A pane's session still running (⇧⌘T right after closing it, or after the app restarted) comes back: in a tab of
    /// its own or split off the shown tab's last pane.
    func adoptPane(session: String, kind: PaneKind, cwd: String, focus: Bool) {
        let pane = makeExtra(kind: kind, cwd: cwd)
        if kind == .tab {
            tabs.append(pane.terminal)
            if focus { selectTab(tabs.count - 1) }
        } else {
            if zoomed { _ = toggleZoom() }
            insert(pane.terminal, beside: terminals(in: activeTab).last ?? terminal, vertical: kind == .vertical)
        }
        refreshPanes()
        if focus { self.focus(pane.terminal) }
        pane.start(session: session, parent: detached?.name, fit: isShown)
    }

    /// `new` goes beside `old`: after it (right or below), or `before` it.
    private func insert(_ new: NSView, beside old: NSView, vertical: Bool, before: Bool = false) {
        // Only the pane in front is halved, as in iTerm2; the others keep their size.
        if let sv = old.superview as? PaneSplitView, sv.isVertical == vertical, let i = sv.arrangedSubviews.firstIndex(of: old) {
            return sv.insertArrangedSubview(new, at: before ? i : i + 1, from: old)
        }
        let sv = PaneSplitView()
        sv.isVertical = vertical
        replace(old, with: sv)
        sv.addArrangedSubview(before ? new : old)
        sv.addArrangedSubview(before ? old : new)
    }

    /// Puts `new` where `old` is: in its split view, or as its tab's root.
    private func replace(_ old: NSView, with new: NSView) {
        if let sv = old.superview as? PaneSplitView {
            sv.replaceArrangedSubview(old, with: new)
        } else if let t = tabs.firstIndex(where: { $0 === old }) {
            let shown = old.superview === paneArea
            old.removeFromSuperview()
            tabs[t] = new
            if shown { mount(new) }
        }
    }

    /// Takes a pane's view out: its split view closes up, a split view left with one pane gives way to it, a tab left with
    /// none closes.
    private func removePaneView(_ v: NSView) {
        focusHistory.removeAll { $0 === v }
        if let t = tabs.firstIndex(where: { $0 === v }) {
            v.removeFromSuperview()
            tabs.remove(at: t)
            if activeTab > t || activeTab >= tabs.count { activeTab = max(0, activeTab - 1) }
            if let root = tabs.indices.contains(activeTab) ? tabs[activeTab] : nil, root.superview !== paneArea { mount(root) }
            return
        }
        guard let sv = v.superview as? PaneSplitView else { return v.removeFromSuperview() }
        v.removeFromSuperview()
        if sv.arrangedSubviews.count == 1, let only = sv.arrangedSubviews.first {
            replace(sv, with: only)
        }
    }

    func selectTab(_ i: Int) {
        guard tabs.indices.contains(i) else { return }
        if zoomed { _ = toggleZoom() }
        if tabs.indices.contains(activeTab), tabs[activeTab].superview === paneArea, activeTab != i { tabs[activeTab].removeFromSuperview() }
        activeTab = i
        if tabs[i].superview !== paneArea { mount(tabs[i]) }
        refreshPanes()
        focus(focusTarget(in: i))
        for tv in terminals(in: i) { extra(of: tv)?.fit() }
        if terminals(in: i).contains(where: { $0 === terminal }) { fitSession() }
    }

    // MARK: dragging a tab, as in iTerm2: along the bar to move it, onto a pane of the shown tab to split it there

    /// Where a dragged tab would go: a pane of the shown tab and the side it would take, or a place in the tab bar.
    private enum TabDrop { case pane(ChatTerminalView, NSRectEdge), slot(Int) }

    private func tabDrop(at point: NSPoint) -> TabDrop? {
        guard let i = draggedTab else { return nil }
        if let slot = tabBar.slot(at: point) { return .slot(slot) }
        // Only into another tab's panes: the shown one's (a tab can't split into itself).
        guard i != activeTab else { return nil }
        for tv in terminals(in: activeTab) where !tv.isHidden {
            let f = tv.convert(tv.bounds, to: nil)
            guard f.contains(point) else { continue }
            // The nearest side (window coordinates count up from the bottom).
            let dx = (point.x - f.midX) / f.width, dy = (point.y - f.midY) / f.height
            return .pane(tv, abs(dx) > abs(dy) ? (dx < 0 ? .minX : .maxX) : (dy < 0 ? .minY : .maxY))
        }
        return nil
    }

    private func dragTab(_ i: Int, _ phase: TabDrag) {
        switch phase {
        case .began:
            guard tabs.indices.contains(i) else { return }
            if zoomed { _ = toggleZoom() }
            draggedTab = i
        case .moved(let p):
            if draggedTab != nil { showDrop(tabDrop(at: p)) }
        case .ended(let p):
            guard draggedTab != nil else { return }
            let drop = tabDrop(at: p)
            showDrop(nil)
            draggedTab = nil
            switch drop {
            case .slot(let slot): moveTab(i, to: slot)
            case .pane(let tv, let edge): joinTab(i, beside: tv, edge: edge)
            case nil: break
            }
        }
    }

    /// The orange area over the half of the pane the tab would take, or a line in the tab bar where it would go.
    private func showDrop(_ drop: TabDrop?) {
        guard let drop else { return dropZone.isHidden = true }
        var r: NSRect
        switch drop {
        case .slot(let i):
            r = tabBar.marker(at: i)
        case .pane(let tv, let edge):
            r = tv.convert(tv.bounds, to: nil)
            switch edge {
            case .minX: r.size.width /= 2
            case .maxX: r.origin.x += r.width / 2; r.size.width /= 2
            case .minY: r.size.height /= 2
            default: r.origin.y += r.height / 2; r.size.height /= 2
            }
        }
        dropZone.frame = container.convert(r, from: nil)
        dropZone.isHidden = false
    }

    /// Tab `i` let go on a pane of the shown tab: its panes leave their tab and join this one, beside `target` on
    /// `edge`'s side, taking half its room.
    private func joinTab(_ i: Int, beside target: ChatTerminalView, edge: NSRectEdge) {
        guard i != activeTab, tabs.indices.contains(i) else { return }
        let root = tabs.remove(at: i)
        root.removeFromSuperview()
        if i < activeTab { activeTab -= 1 }
        let vertical = edge == .minX || edge == .maxX
        insert(root, beside: target, vertical: vertical, before: edge == .minX || edge == .maxY)
        for tv in terminals(in: activeTab) where tv === root || tv.isDescendant(of: root) {
            extra(of: tv)?.rekind(vertical ? .vertical : .horizontal)
        }
        refreshPanes()
        window?.layoutIfNeeded()
        for tv in terminals(in: activeTab) { extra(of: tv)?.fit() }
        fitSession()
        focus(terminals(in: activeTab).first { $0 === root || $0.isDescendant(of: root) } ?? target)
    }

    /// Tab `i` moves to `slot` in the bar (its place before the move: 0 is first, the tab count after the last).
    private func moveTab(_ i: Int, to slot: Int) {
        guard tabs.indices.contains(i) else { return }
        let j = slot > i ? slot - 1 : slot
        guard j != i, tabs.indices.contains(j) else { return }
        let shown = tabs[activeTab]
        tabs.insert(tabs.remove(at: i), at: j)
        activeTab = tabs.firstIndex { $0 === shown } ?? activeTab
        refreshPanes()
    }

    /// ⌥⇧⌘[ / ⌥⇧⌘]: the shown tab moves a place left or right; false when it can't.
    func moveTab(step: Int) -> Bool {
        let to = activeTab + step
        guard tabs.count > 1, tabs.indices.contains(to) else { return false }
        moveTab(activeTab, to: step > 0 ? to + 1 : to)
        return true
    }

    /// ⇧⌘] / ⇧⌘[: the next or previous tab; false with only one (the caller moves to another window).
    func selectTab(step: Int) -> Bool {
        guard tabs.count > 1 else { return false }
        selectTab((activeTab + step + tabs.count) % tabs.count)
        return true
    }

    /// A tab's × (iTerm2 asks the same way when something runs in it).
    private func closeTab(_ i: Int) {
        guard tabs.indices.contains(i) else { return }
        let panes = terminals(in: i).compactMap { extra(of: $0) }
        // The tab with this window's own chat or terminal closes the window, which keeps it running.
        guard panes.count == terminals(in: i).count else {
            if hide() { manager?.closed(id) }
            return
        }
        for pane in panes { close(pane) }
    }

    /// ⌘]/⌘[: the next or previous pane in the shown tab; false with only one.
    func selectPane(step: Int) -> Bool {
        if zoomed { _ = toggleZoom() }
        let ts = terminals(in: activeTab)
        guard ts.count > 1 else { return false }
        let i = ts.firstIndex { $0 === focusedTerminal } ?? 0
        focus(ts[(i + step + ts.count) % ts.count])
        return true
    }

    /// ⌥⌘ and an arrow (`dy` up is +1): the pane that way in the shown tab; false when there's none.
    func selectPane(dx: CGFloat, dy: CGFloat) -> Bool {
        if zoomed { _ = toggleZoom() }
        let cur = focusedTerminal
        let cf = cur.convert(cur.bounds, to: nil)
        var best: (ChatTerminalView, CGFloat)?
        for tv in terminals(in: activeTab) where tv !== cur {
            let f = tv.convert(tv.bounds, to: nil)
            let x = f.midX - cf.midX, y = f.midY - cf.midY
            let along = x * dx + y * dy
            guard along > 10 else { continue }
            let score = along + 2 * abs(x * dy - y * dx)
            if best.map({ score < $0.1 }) ?? true { best = (tv, score) }
        }
        guard let best else { return false }
        focus(best.0)
        return true
    }

    /// ⌃⌘ and an arrow: the nearest divider across that way moves 40 points; false when there's none.
    func moveDivider(dx: CGFloat, dy: CGFloat) -> Bool {
        if zoomed { _ = toggleZoom() }
        var v: NSView = focusedTerminal
        while let sv = v.superview as? PaneSplitView {
            if sv.isVertical == (dx != 0), let i = sv.arrangedSubviews.firstIndex(of: v) {
                let k = i < sv.arrangedSubviews.count - 1 ? i : i - 1
                let f = sv.arrangedSubviews[k].frame
                // A split view counts from the top: up is a smaller y.
                sv.setPosition(sv.isVertical ? f.maxX + dx * 40 : f.maxY - dy * 40, ofDividerAt: k)
                return true
            }
            v = sv
        }
        return false
    }

    /// ⇧⌘↩: only the pane in front shows in its tab, and back; false with only one pane.
    func toggleZoom() -> Bool {
        if zoomed {
            zoomed = false
            func unhide(_ v: NSView) {
                guard let sv = v as? PaneSplitView else { return }
                for s in sv.arrangedSubviews {
                    s.isHidden = false
                    unhide(s)
                }
                sv.needsLayout = true
            }
            if tabs.indices.contains(activeTab) { unhide(tabs[activeTab]) }
        } else {
            guard terminals(in: activeTab).count > 1 else { return false }
            zoomed = true
            var v: NSView = focusedTerminal
            while let sv = v.superview as? PaneSplitView {
                for s in sv.arrangedSubviews where s !== v { s.isHidden = true }
                sv.needsLayout = true
                v = sv
            }
        }
        window?.layoutIfNeeded()
        dimInactive()
        for tv in terminals(in: activeTab) { extra(of: tv)?.fit() }
        fitSession()
        return true
    }

    /// ⌘W: a pane besides this window's own closes, as in iTerm2. False for the window's own pane: the window itself
    /// closes then (hides; its chat keeps running).
    func closeFocusedPane() -> Bool {
        guard let pane = extra(of: focusedTerminal) else { return false }
        close(pane)
        return true
    }

    /// Closes a pane as a window closes: what runs in it goes on, a car on the orbit until it's opened again (a click,
    /// ⇧⌘T) or the window's End Session ends it. A pane without a session of its own (screen couldn't start) just stops.
    private func close(_ pane: ExtraPane) {
        if zoomed { _ = toggleZoom() }
        let folder = pane.currentFolder
        removePaneView(pane.terminal)
        extras.removeAll { $0 === pane }
        if let name = pane.link?.name {
            pane.detach()
            manager?.closedPane(of: self, session: name, kind: pane.kind, cwd: folder)
        } else {
            pane.end()
        }
        refreshPanes()
        focus(focusTarget(in: activeTab))
    }

    /// A pane's shell exited: the pane goes, as in iTerm2.
    func paneEnded(_ pane: ExtraPane) {
        guard extras.contains(where: { $0 === pane }) else { return }
        if zoomed { _ = toggleZoom() }
        removePaneView(pane.terminal)
        extras.removeAll { $0 === pane }
        refreshPanes()
        if window?.isKeyWindow == true { focus(focusTarget(in: activeTab)) }
    }

    /// Every extra pane's shell stops (End, or the window goes).
    func endPanes() {
        for pane in extras { pane.end() }
    }

    /// The app quits: the panes let go of their sessions, which keep running and come back next launch.
    func detachPanes() {
        for pane in extras { pane.detach() }
    }

    private func refreshPanes() {
        let many = tabs.count > 1
        tabBar.isHidden = !many
        if many {
            paneTop.isActive = false
            paneTopUnderTabs.isActive = true
            tabBar.show(titles: tabs.indices.map(tabTitle), active: activeTab)
        } else {
            paneTopUnderTabs.isActive = false
            paneTop.isActive = true
        }
        dimInactive()
        manager?.panesChanged()
    }

    private func tabTitle(_ i: Int) -> String {
        let ts = terminals(in: i)
        if ts.contains(where: { $0 === terminal }) { return window?.title ?? "" }
        return ((ts.first.flatMap { extra(of: $0) }?.currentFolder ?? cwd) as NSString).lastPathComponent
    }

    /// As in iTerm2, the panes without the keyboard dim a little.
    private func dimInactive() {
        let ts = terminals(in: activeTab)
        let focus = focusedTerminal
        for tv in ts { tv.alphaValue = ts.count > 1 && tv !== focus ? 0.7 : 1 }
    }

    /// Gives a pane the keyboard.
    private func focus(_ tv: ChatTerminalView) {
        window?.makeFirstResponder(tv)
        focusChanged()
    }

    private func focusChanged() {
        guard let tv = window?.firstResponder as? ChatTerminalView, allTerminals.contains(where: { $0 === tv }) else { return }
        focusHistory.removeAll { $0 === tv }
        focusHistory.append(tv)
        dimInactive()
        manager?.terminalFocused(window: id)
    }

    /// The dashboard's menus (friends, settings, updates) open on the dashboard, under the windows pinned above it:
    /// those step out of the way meanwhile. Always-on-top windows stay.
    func stepAside() {
        guard let w = window, isShown, !hud.onTop, !steppedAside else { return }
        steppedAside = true
        w.parent?.removeChildWindow(w)
        w.orderOut(nil)
    }

    func stepBack() {
        guard steppedAside, let w = window else { return }
        steppedAside = false
        guard isShown else { return }
        if hud.attached, let parent = manager?.window, parent.isVisible { parent.addChildWindow(w, ordered: .above) }
        w.orderFront(nil)
    }

    /// `confirm` false: asked already (a dashboard card's red button).
    func endChat(confirm: Bool = true) {
        // With tabs, End Session ends the tab in front only: another tab's panes, or the window's own chat or terminal
        // (its tab goes, the others run on).
        if tabs.count > 1, !hud.mirror {
            if !terminals(in: activeTab).contains(where: { $0 === terminal }) { return endTab(activeTab, confirm: confirm) }
            return endOwnTab(confirm: confirm && !hud.exited)
        }
        // A mirror only closes: the chat runs on in the app that owns it.
        if hud.mirror {
            let finish = { [weak self] in
                guard let self else { return }
                self.terminal.terminate()
                self.manager?.removeChat(self.id)
            }
            if !hide(then: finish) { finish() }
            return
        }
        // A copy takes its original along: the Claude it was copied from stops in its iTerm2 tab, which closes.
        // Only while that Claude still runs there.
        let original = origin.flatMap { o in Proc.info(o.claude)?.tty == o.tty && Proc.isClaude(o.claude) ? o : nil }
        let shellOnly = hud.status == "terminal"
        // Like iTerm2: a terminal whose shell runs nothing closes without asking.
        let idle = shellOnly && shellPid > 0 && Proc.children(of: shellPid).isEmpty
        // Its own chat over, what's left are panes: asks when something runs in them.
        if confirm, hud.exited, original == nil, busy(extras), !ask("End this tab?", "What runs in it stops.", "End Tab") { return }
        if confirm, (!hud.exited && !idle) || original != nil {
            let a = NSAlert()
            a.messageText = shellOnly ? "Close this terminal?" : "End this chat?"
            if shellOnly {
                a.informativeText = "The shell in this window stops."
            } else if let original {
                let busy = manager?.status(of: original.claude) == "busy"
                a.informativeText = "Claude stops here and in the iTerm2 tab it was copied from" + (busy ? ", where it is still working" : "")
                    + ", and that tab closes. Both conversations stay saved and you can resume them later."
            } else {
                a.informativeText = "Claude in this window stops. The conversation stays saved and you can resume it later."
            }
            a.alertStyle = .warning
            a.addButton(withTitle: shellOnly ? "Close Terminal" : "End Chat")
            a.addButton(withTitle: "Cancel")
            guard a.runModal() == .alertFirstButtonReturn else { return }
        }
        // The dashboard drops the session now, while the window powers off, so it can't be clicked open again; a
        // terminal's car blows up on the orbit at the same moment.
        manager?.dismiss(sessionId: sessionId, pid: hud.brief?.live == true ? hud.brief?.pid : nil)
        manager?.terminalEnding(carId)
        if let original { manager?.dismiss(sessionId: manager?.sessionId(of: original.claude), pid: original.claude) }
        let finish = { [weak self] in
            guard let self else { return }
            if let detached = self.detached {
                Detached.quit(detached.name)
                // Its tabs and panes closed earlier, still running, end with it.
                self.manager?.endParked(of: detached.name)
            }
            self.endPanes()
            self.terminal.terminate()
            if let original { ITerm.end(original) }
            self.manager?.removeChat(self.id)
        }
        // Without the power-off animation (window hidden, or still powering on) the chat ends all the same.
        if !hide(then: finish) { finish() }
    }

    /// End Session on a tab of extra panes: they end (their shells and what runs in them), the window stays.
    private func endTab(_ i: Int, confirm: Bool) {
        let panes = terminals(in: i).compactMap { extra(of: $0) }
        if confirm, busy(panes), !ask("End this tab?", "What runs in it stops.", "End Tab") { return }
        if zoomed { _ = toggleZoom() }
        for pane in panes {
            if let name = pane.link?.name { manager?.terminalEnding("s:" + name) }
            removePaneView(pane.terminal)
            extras.removeAll { $0 === pane }
            pane.end()
        }
        refreshPanes()
        focus(focusTarget(in: activeTab))
    }

    /// End Session on the window's own tab while others are open: its chat or terminal ends and its tab goes; the
    /// window lives on with the other tabs (closed, they keep running as cars).
    private func endOwnTab(confirm: Bool) {
        let shellOnly = hud.status == "terminal"
        if confirm, !ask(shellOnly ? "End this terminal?" : "End this chat?",
                         shellOnly ? "The shell in this tab stops; the other tabs keep running." : "Claude in this tab stops; the other tabs keep running. The conversation stays saved.",
                         shellOnly ? "End Terminal" : "End Chat") { return }
        manager?.dismiss(sessionId: sessionId, pid: hud.brief?.live == true ? hud.brief?.pid : nil)
        manager?.terminalEnding(carId)
        if let detached { Detached.quit(detached.name) }
        // Its tab goes (or its place in a split, which closes up).
        if zoomed { _ = toggleZoom() }
        removePaneView(terminal)
        refreshPanes()
        focus(focusTarget(in: activeTab))
    }

    private func busy(_ panes: [ExtraPane]) -> Bool {
        panes.contains { $0.shellPid > 0 && !Proc.children(of: $0.shellPid).isEmpty }
    }

    private func ask(_ title: String, _ text: String, _ ok: String) -> Bool {
        let a = NSAlert()
        a.messageText = title
        a.informativeText = text
        a.alertStyle = .warning
        a.addButton(withTitle: ok)
        a.addButton(withTitle: "Cancel")
        return a.runModal() == .alertFirstButtonReturn
    }

    /// The window goes after its own chat or terminal ended: its other tabs and panes keep running, as cars.
    func parkPanes() {
        for pane in extras {
            let folder = pane.currentFolder
            guard let name = pane.link?.name else {
                pane.end()
                continue
            }
            pane.detach()
            manager?.closedPane(of: self, session: name, kind: pane.kind, cwd: folder)
        }
        extras.removeAll()
    }

    private var attached = false
    /// Becomes a display of the detached session.
    /// Restored after a restart: takes back its kept scrollback before it attaches (see Detached.saveHistory).
    var takesHistory = false
    /// The terminal's height in rows, as it last reported it.
    private var termRows = 0

    func attachSession() {
        guard let detached, !attached else { return }
        attached = true
        if takesHistory {
            takesHistory = false
            let history = Detached.takeHistory(detached.name)
            if !history.isEmpty {
                // Then blank rows push it all above the screen, where screen's repaint can't overwrite it.
                terminal.feed(text: history.joined(separator: "\r\n") + String(repeating: "\r\n", count: max(termRows, 60) + 1))
            }
        }
        // A mirror shows the chat at the size its own app gave it, and never resizes it under that app's window.
        TerminalFactory.attach(terminal, screenName: detached.name, cwd: cwd, fit: isShown && !hud.mirror)
        fitSession()
    }

    /// On quit: this window's scrollback, for the window that attaches to the session next time.
    func saveHistory() {
        guard let detached, attached, !hud.mirror, !hud.exited else { return }
        let text = String(decoding: terminal.getBufferAsData(kind: .normal), as: UTF8.self)
        Detached.saveHistory(detached.name, text: text, rows: termRows)
    }

    private var fitWork: DispatchWorkItem?
    /// Fits the session to this window once its size has settled, so Claude draws at the window's size.
    func fitSession() {
        guard let detached, attached, isShown, !hud.mirror else { return }
        fitWork?.cancel()
        let name = detached.name
        let work = DispatchWorkItem { Detached.fit(name) }
        fitWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6, execute: work)
    }

    func apply(_ brief: SessionBrief?) {
        if let brief {
            if hud.brief != brief { hud.brief = brief }
            if brief.tab == id { sessionId = brief.id }
            let title = brief.title.isEmpty ? brief.name : brief.title
            if window?.title != title { window?.title = title }
        }
        border.setStatus(hud.status)
    }

    func setFont(_ size: CGFloat) { for tv in allTerminals { tv.font = Theme.mono(size) } }

    /// The process that is Claude's parent: the shell inside the detached session, or our own shell.
    var shellPid: Int32 {
        if hud.exited { return 0 }
        if let detached { return detached.shellPid ?? 0 }
        return terminal.process.shellPid
    }

    // MARK: NSWindowDelegate

    // A window pinned above the dashboard is the dashboard's child, and a child minimized on its own left the
    // dashboard black. So it lets go of the dashboard on its way to the Dock and pins again when it comes back.
    func windowWillMiniaturize(_ notification: Notification) {
        guard let w = window else { return }
        w.parent?.removeChildWindow(w)
    }

    // The window clicked last comes to the front of the others pinned above the dashboard: AppKit doesn't reorder a
    // parent's child windows on a click.
    func windowDidBecomeKey(_ notification: Notification) {
        focusChanged()
        manager?.terminalFocused(window: id)
        guard let w = window, let parent = w.parent, parent.childWindows?.last != w else { return }
        parent.removeChildWindow(w)
        parent.addChildWindow(w, ordered: .above)
    }

    func windowDidDeminiaturize(_ notification: Notification) {
        guard let w = window, hud.attached, let parent = manager?.window, parent.isVisible else { return }
        parent.addChildWindow(w, ordered: .above)
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if hud.mirror {
            endChat()
        } else if hud.exited {
            // Its other tabs, still running, become cars instead of ending with it.
            parkPanes()
            hide { [weak self] in
                guard let self else { return }
                self.manager?.removeChat(self.id)
            }
        } else {
            // Closing only hides: a chat comes back from its dashboard card, a terminal from its flying car on the
            // orbit, the last one closed with ⇧⌘T. Ending is the power button (End).
            if hide() { manager?.closed(id) }
        }
        return false
    }

    // MARK: LocalProcessTerminalViewDelegate

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {
        termRows = newRows
        fitSession()
    }
    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {}
    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}

    func processTerminated(source: TerminalView, exitCode: Int32?) {
        hud.exited = true
        border.setStatus("ended")
        terminal.feed(text: "\r\n\u{1b}[2m[chat ended · close this window to remove it]\u{1b}[0m\r\n")
        manager?.chatProcessEnded(id)
        if !isShown { manager?.removeChat(id) }
    }
}
