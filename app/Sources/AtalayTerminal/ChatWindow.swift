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
        let hex: UInt32 = e.kind == "prompt" ? 0xFFB057 : e.kind == "say" ? 0xD9C3A8 : Theme.catHex[e.cat ?? ""] ?? 0xA99BC4
        let tag = e.kind == "tool" ? Theme.catLabel[e.cat ?? ""] ?? "tool" : e.kind == "prompt" ? "you" : e.kind == "say" ? "claude" : e.kind
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
    let onTogglePin: () -> Void
    let onDashboard: () -> Void
    let onEnd: () -> Void

    var body: some View {
        // Clocks tick once a second. Per-frame effects here kept the main thread busy and froze the
        // app with several chats open; the moving parts of a chat window are Core Animation layers.
        TimelineView(.periodic(from: .now, by: hud.visible ? 1 : 3600)) { tl in
            let status = hud.status
            let hex = Theme.statusHex[status] ?? 0x5C4D40
            ZStack(alignment: .topLeading) {
                HeaderBackdrop(hex: hex)
                VStack(alignment: .leading, spacing: 0) {
                    TitleRow(hud: hud, now: tl.date, status: status, hex: hex)
                        .frame(height: 32)
                    HUDRow(hud: hud, now: tl.date, hex: hex, onTogglePin: onTogglePin, onDashboard: onDashboard, onEnd: onEnd)
                        .frame(height: 30)
                }
            }
        }
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
        HStack(spacing: 8) {
            Image(systemName: "hexagon")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(color)
                .shadow(color: color, radius: 6)
            Text(name)
                .font(.mono(12, .bold))
                .foregroundColor(Theme.cAccent)
                .shadow(color: Theme.cAccent.opacity(0.6), radius: 6)
                .lineLimit(1)
            Text("·").font(.mono(12)).foregroundColor(Theme.cDim2)
            Text(title)
                .font(.mono(12))
                .foregroundColor(Theme.cHi)
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
            .foregroundColor(waiting ? Color(hex: 0x1A0D00) : color)
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
            HUDButton(symbol: hud.onTop ? "pin.fill" : "pin", active: hud.onTop,
                      help: hud.onTop ? "Pinned on top of every app, on any desktop. Click to put it back above the dashboard."
                          : "Pin on top of every app (Discord, Chrome…). It leaves the dashboard, even a full-screen one.",
                      hex: hex, action: onTogglePin)
            HUDButton(symbol: "square.grid.2x2", active: false, help: "Back to the dashboard (this chat keeps running)", hex: hex, action: onDashboard)
            HUDButton(symbol: "power", active: false,
                      help: hud.mirror ? "Close this mirror (the chat keeps running in the other app)" : hud.status == "terminal" ? "Close this terminal" : "End this chat",
                      hex: 0xFF4D4D, action: onEnd)
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
        let color = Color(hex: Theme.catHex[b.actionCat] ?? 0xA99BC4)
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
                .foregroundColor(active ? Color(hex: 0x1A0D00) : (hover ? Theme.cHi : Theme.cDim))
                .frame(width: 24, height: 20)
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

    var body: some View {
        TimelineView(.periodic(from: .now, by: hud.visible ? 1 : 3600)) { tl in
            let blinkOff = Int(tl.date.timeIntervalSinceReferenceDate) % 2 == 0
            let status = hud.status
            let color = Color(hex: Theme.statusHex[status] ?? 0x5C4D40)
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
        .overlay(alignment: .top) { Rectangle().fill(Color(hex: Theme.statusHex[hud.status] ?? 0x5C4D40, opacity: 0.3)).frame(height: 1) }
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
        guard status != current else { return }
        current = status
        var colors: [UInt32]
        var spin: Double
        var glowHex: UInt32
        switch status {
        case "busy": colors = [0xF88008, 0xFFD23F, 0xFF2E63, 0xF88008]; spin = 3.2; glowHex = 0xF88008
        case "idle", "terminal": colors = [0x00E5FF, 0x0F1A1F, 0x9D6BFF, 0x00E5FF]; spin = 9; glowHex = 0x00E5FF
        case "waiting": colors = [0xFF2E63, 0xF88008, 0xFFD23F, 0xFF2E63]; spin = 1.1; glowHex = 0xFF2E63
        default: colors = [0x4D3F33, 0x1F1812, 0x4D3F33]; spin = 0; glowHex = 0x4D3F33
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
        p.duration = status == "waiting" ? 0.45 : 1.6
        p.autoreverses = true
        p.repeatCount = .infinity
        glow.add(p, forKey: "pulse")
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
        line.colors = [NSColor(hex: 0xF88008, alpha: 0).cgColor, NSColor(hex: 0xFFE2BF).cgColor, NSColor.white.cgColor,
                       NSColor(hex: 0xFFE2BF).cgColor, NSColor(hex: 0xF88008, alpha: 0).cgColor]
        line.startPoint = CGPoint(x: 0, y: 0.5)
        line.endPoint = CGPoint(x: 1, y: 0.5)
        line.shadowColor = NSColor(hex: 0xF88008).cgColor
        line.shadowRadius = 10
        line.shadowOpacity = 1
        line.shadowOffset = .zero
        line.opacity = 0
        dot.backgroundColor = NSColor.white.cgColor
        dot.cornerRadius = 4
        dot.shadowColor = NSColor(hex: 0xFFB057).cgColor
        dot.shadowRadius = 14
        dot.shadowOpacity = 1
        dot.shadowOffset = .zero
        dot.opacity = 0
        layer!.addSublayer(line)
        layer!.addSublayer(dot)
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
    private let container = NSView()
    private let border = NeonBorderView()
    private let flash = FlashView()
    private let beam = BeamView()
    /// How much is selected, and what ⌘C copied, in small type at the terminal's bottom-right, as Claude Code shows it.
    private let selectionBadge = NSTextField(labelWithString: "")
    private var copiedUntil = Date.distantPast
    /// Out of the way while the dashboard shows a menu (see stepAside).
    private var steppedAside = false

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
        terminal.onSelection = { [weak self] text in self?.showSelection(text) }
        terminal.onCopy = { [weak self] text in self?.showCopied(text) }
        buildLayout()
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

    private func buildLayout() {
        guard let w = window else { return }
        let root = NSView()
        root.wantsLayer = true
        root.layer?.backgroundColor = NSColor.clear.cgColor
        w.contentView = root

        container.wantsLayer = true
        container.layer?.cornerRadius = 12
        container.layer?.masksToBounds = true

        let glass = NSVisualEffectView()
        glass.material = .hudWindow
        glass.blendingMode = .behindWindow
        glass.state = .active
        // Let some of the dashboard show through the frost.
        glass.alphaValue = 0.74

        let tint = NSView()
        let warm = CAGradientLayer()
        warm.colors = [NSColor(srgbRed: 52 / 255, green: 28 / 255, blue: 10 / 255, alpha: 0.3).cgColor,
                       NSColor(srgbRed: 14 / 255, green: 9 / 255, blue: 6 / 255, alpha: 0.22).cgColor,
                       NSColor(srgbRed: 10 / 255, green: 7 / 255, blue: 5 / 255, alpha: 0.3).cgColor]
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
            onEnd: { [weak self] in self?.endChat() }))
        let ticker = NSHostingView(rootView: ChatTickerView(hud: hud))

        for v in [container, beam] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            root.addSubview(v)
            pin(v, to: root)
        }
        selectionBadge.font = Theme.mono(10.5, .semibold)
        selectionBadge.textColor = Theme.accent
        selectionBadge.drawsBackground = true
        selectionBadge.backgroundColor = NSColor.black.withAlphaComponent(0.55)
        selectionBadge.isHidden = true
        for v in [glass, tint, header, terminal!, ticker, selectionBadge, border, flash] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            container.addSubview(v)
        }
        for v in [glass, tint, border, flash] as [NSView] { pin(v, to: container) }
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: container.topAnchor),
            header.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            header.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            header.heightAnchor.constraint(equalToConstant: 62),
            ticker.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            ticker.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            ticker.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            ticker.heightAnchor.constraint(equalToConstant: 26),
            terminal.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 6),
            terminal.bottomAnchor.constraint(equalTo: ticker.topAnchor, constant: -4),
            terminal.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 14),
            terminal.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -6),
            selectionBadge.trailingAnchor.constraint(equalTo: terminal.trailingAnchor, constant: -10),
            selectionBadge.bottomAnchor.constraint(equalTo: terminal.bottomAnchor, constant: -6),
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
        if isShown {
            w.makeKeyAndOrderFront(nil)
            w.makeFirstResponder(terminal)
            return
        }
        isShown = true
        hud.visible = true
        terminal.suspendsRenderingWhenNotVisible = false
        // A window that attached while hidden takes over the session size now.
        fitSession()
        if hud.attached, let parent = manager?.window, parent.isVisible { parent.addChildWindow(w, ordered: .above) }
        w.layoutIfNeeded()
        setButtonsHidden(true)
        container.layer?.sublayerTransform = squeeze(0.003, 0.003)
        w.makeKeyAndOrderFront(nil)
        w.makeFirstResponder(terminal)
        runPowerOn()
        manager?.chatVisibilityChanged()
    }

    /// Powers the window off and orders it out; false when it can't (hidden already, or still animating).
    @discardableResult
    func hide(then: (() -> Void)? = nil) -> Bool {
        guard let w = window, isShown, !animating else { return false }
        runPowerOff { [weak self] in
            guard let self else { return }
            w.parent?.removeChildWindow(w)
            w.orderOut(nil)
            self.isShown = false
            // Nothing to draw while hidden; SwiftTerm resumes when the window is shown again.
            self.hud.visible = false
            self.terminal.suspendsRenderingWhenNotVisible = true
            self.resetEffect()
            self.manager?.chatVisibilityChanged()
            then?()
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

    func endChat() {
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
        let original = origin.flatMap { o in Proc.info(o.claude)?.tty == o.tty && Proc.name(o.claude)?.hasPrefix("claude") == true ? o : nil }
        let shellOnly = hud.status == "terminal"
        // Like iTerm2: a terminal whose shell runs nothing closes without asking.
        let idle = shellOnly && shellPid > 0 && Proc.children(of: shellPid).isEmpty
        if (!hud.exited && !idle) || original != nil {
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
        manager?.terminalEnding(id)
        if let original { manager?.dismiss(sessionId: manager?.sessionId(of: original.claude), pid: original.claude) }
        let finish = { [weak self] in
            guard let self else { return }
            if let detached = self.detached { Detached.quit(detached.name) }
            self.terminal.terminate()
            if let original { ITerm.end(original) }
            self.manager?.removeChat(self.id)
        }
        // Without the power-off animation (window hidden, or still powering on) the chat ends all the same.
        if !hide(then: finish) { finish() }
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

    func setFont(_ size: CGFloat) { terminal.font = Theme.mono(size) }

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
            hide { [weak self] in
                guard let self else { return }
                self.manager?.removeChat(self.id)
            }
        } else {
            // Closing only hides: a chat comes back from its dashboard card, a terminal from its flying car on the
            // orbit. Ending is the power button (End).
            hide()
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
