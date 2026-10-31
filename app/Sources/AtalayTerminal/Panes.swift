import AppKit
import SwiftTerm

// iTerm2's tabs and split panes inside a chat window (ChatWindowController): ⌘T opens a tab, ⌘D and ⇧⌘D split the pane
// in front. The window's own chat or terminal is its first pane; every other one is an ExtraPane, a shell of its own in
// a detached session named after the window's (so it outlives the app too, and comes back into the same window).

/// How an extra pane was opened: in its own tab, or split off beside (vertical) or under (horizontal) another pane.
enum PaneKind: Character {
    case tab = "t", vertical = "v", horizontal = "h"
}

extension Detached {
    /// An extra pane's session: `<prefix>x<kind><8 hex>-<the window session's id>`. It must not start with the window's
    /// session name: screen picks sessions by prefix, and `-S name -X quit` refuses when two match.
    static func extraName(parent: String, kind: PaneKind) -> String {
        let hex = String(UUID().uuidString.lowercased().filter(\.isHexDigit).prefix(8))
        return prefix + "x" + String(kind.rawValue) + hex + "-" + parent.dropFirst(prefix.count)
    }

    /// The window session and the kind of an extra pane's session; nil for any other session.
    static func extraInfo(_ name: String) -> (parent: String, kind: PaneKind)? {
        guard name.hasPrefix(prefix) else { return nil }
        let rest = Array(name.dropFirst(prefix.count))
        guard rest.count > 11, rest[0] == "x", let kind = PaneKind(rawValue: rest[1]), rest[10] == "-",
              rest[2..<10].allSatisfy(\.isHexDigit) else { return nil }
        return (prefix + String(rest[11...]), kind)
    }
}

/// A pane besides the window's own: a shell in its own detached session.
@MainActor
final class ExtraPane: NSObject, LocalProcessTerminalViewDelegate {
    private(set) var terminal: ChatTerminalView!
    let kind: PaneKind
    let cwd: String
    private(set) var link: DetachedLink?
    weak var owner: ChatWindowController?
    /// Stopped on purpose (closed, or the app quits): its process ending isn't news.
    private var closing = false
    private var attached = false
    private var fitWork: DispatchWorkItem?
    /// The terminal's height in rows, as it last reported it.
    private var rows = 0

    init(owner: ChatWindowController, cwd: String, kind: PaneKind, fontSize: CGFloat) {
        self.owner = owner
        self.cwd = cwd
        self.kind = kind
        super.init()
        terminal = TerminalFactory.makeIdle(chatId: owner.id, fontSize: fontSize, delegate: self)
        try? terminal.setUseMetal(true)
    }

    /// A new shell in a new session next to the window's, or (`session`) one still running from before.
    func start(session: String?, parent: String?, fit: Bool) {
        guard let parent, Detached.available else { return runLocally() }
        if let session {
            link = DetachedLink(name: session)
            // Its scrollback from before (the app quit, or the pane closed a moment ago), above the rows screen
            // repaints: like the window's own terminal (ChatWindowController.attachSession).
            let history = Detached.takeHistory(session)
            if !history.isEmpty {
                terminal.feed(text: history.joined(separator: "\r\n") + String(repeating: "\r\n", count: max(rows, 60) + 1))
            }
            return attach(fit: fit)
        }
        let name = Detached.extraName(parent: parent, kind: kind)
        link = DetachedLink(name: name)
        Detached.start(name: name, cwd: cwd, claudeArgs: nil) { [weak self] ok in
            guard let self, !self.closing else { return }
            ok ? self.attach(fit: fit) : self.runLocally()
        }
    }

    private func runLocally() {
        link = nil
        attached = true
        TerminalFactory.start(terminal, cwd: cwd, claudeArgs: nil)
    }

    private func attach(fit: Bool) {
        guard let link, !attached else { return }
        attached = true
        TerminalFactory.attach(terminal, screenName: link.name, cwd: cwd, fit: fit)
        self.fit()
    }

    /// The session takes this pane's size once it has settled.
    func fit() {
        guard let link, attached else { return }
        fitWork?.cancel()
        let name = link.name
        let work = DispatchWorkItem { Detached.fit(name) }
        fitWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4, execute: work)
    }

    var shellPid: Int32 {
        guard attached else { return 0 }
        if let link { return link.shellPid ?? 0 }
        return terminal.process.shellPid
    }

    var currentFolder: String { (shellPid > 0 ? Proc.cwd(shellPid) : nil) ?? cwd }

    /// Whether something runs in its shell (closing it would stop that).
    var busy: Bool { shellPid > 0 && !Proc.children(of: shellPid).isEmpty }

    /// Lets go of the session without ending it (the app quits, or ⇧⌘T may bring it back), keeping its scrollback for
    /// the pane that attaches next.
    func detach() {
        if let link, attached, !closing {
            let text = String(decoding: terminal.getBufferAsData(kind: .normal), as: UTF8.self)
            Detached.saveHistory(link.name, text: text, rows: rows)
        }
        closing = true
        terminal.terminate()
    }

    /// Ends the pane's shell and session.
    func end() {
        closing = true
        if let link { Detached.quit(link.name) }
        terminal.terminate()
    }

    // MARK: LocalProcessTerminalViewDelegate

    func sizeChanged(source: LocalProcessTerminalView, newCols: Int, newRows: Int) {
        rows = newRows
        fit()
    }
    func setTerminalTitle(source: LocalProcessTerminalView, title: String) {}
    func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}

    /// Its shell exited (`exit`, Ctrl-D): the pane closes, as in iTerm2.
    func processTerminated(source: TerminalView, exitCode: Int32?) {
        guard !closing else { return }
        closing = true
        if let link { Detached.forgetHistory(link.name) }
        owner?.paneEnded(self)
    }
}

/// Panes side by side (`isVertical`) or one above the other, with a thin orange line between them that can be dragged.
/// Laid out by hand: each pane keeps a share of the room, and a new pane takes half of its neighbour's, as in iTerm2.
/// A hidden pane (⇧⌘↩) gives its room to the others until it shows again.
@MainActor
final class PaneSplitView: NSView {
    var isVertical = true { didSet { needsLayout = true } }
    let dividerThickness: CGFloat = 5
    private(set) var arrangedSubviews: [NSView] = []
    private var shares: [CGFloat] = []
    private var dragging: Int?
    private let minimum: CGFloat = 60

    override var isFlipped: Bool { true }

    func addArrangedSubview(_ v: NSView) { insertArrangedSubview(v, at: arrangedSubviews.count) }

    /// `v` goes in at `i` and takes half the share of the pane before it (of the one after it when it's first).
    func insertArrangedSubview(_ v: NSView, at i: Int) {
        v.removeFromSuperview()
        var share: CGFloat = 1
        if !arrangedSubviews.isEmpty {
            let k = i > 0 ? i - 1 : 0
            share = shares[k] / 2
            shares[k] -= share
        }
        arrangedSubviews.insert(v, at: i)
        shares.insert(share, at: i)
        adopt(v)
    }

    /// `new` takes `old`'s place and share.
    func replaceArrangedSubview(_ old: NSView, with new: NSView) {
        guard let i = arrangedSubviews.firstIndex(of: old) else { return }
        new.removeFromSuperview()
        arrangedSubviews[i] = new
        old.removeFromSuperview()
        adopt(new)
    }

    private func adopt(_ v: NSView) {
        v.translatesAutoresizingMaskIntoConstraints = true
        v.autoresizingMask = []
        addSubview(v)
        needsLayout = true
        window?.invalidateCursorRects(for: self)
    }

    /// A pane taken out leaves its share to the one before it (after it, when it was first).
    override func willRemoveSubview(_ subview: NSView) {
        super.willRemoveSubview(subview)
        guard let i = arrangedSubviews.firstIndex(of: subview) else { return }
        let share = shares.remove(at: i)
        arrangedSubviews.remove(at: i)
        if !shares.isEmpty { shares[i > 0 ? i - 1 : 0] += share }
        needsLayout = true
    }

    func equalize() {
        shares = Array(repeating: 1 / CGFloat(max(1, shares.count)), count: shares.count)
        needsLayout = true
    }

    private var length: CGFloat { isVertical ? bounds.width : bounds.height }

    private var shown: [Int] { arrangedSubviews.indices.filter { !arrangedSubviews[$0].isHidden } }

    override func layout() {
        super.layout()
        let visible = shown
        guard !visible.isEmpty else { return }
        let room = length - CGFloat(visible.count - 1) * dividerThickness
        let total = visible.reduce(CGFloat(0)) { $0 + shares[$1] }
        var pos: CGFloat = 0
        for (n, i) in visible.enumerated() {
            let size = n == visible.count - 1 ? length - pos : (room * shares[i] / max(total, 0.0001)).rounded()
            arrangedSubviews[i].frame = isVertical
                ? NSRect(x: pos, y: 0, width: max(0, size), height: bounds.height)
                : NSRect(x: 0, y: pos, width: bounds.width, height: max(0, size))
            pos += size + dividerThickness
        }
        window?.invalidateCursorRects(for: self)
        needsDisplay = true
    }

    /// The gap after pane `i` (between it and the next shown one).
    private func gap(after i: Int) -> NSRect {
        let f = arrangedSubviews[i].frame
        return isVertical
            ? NSRect(x: f.maxX, y: 0, width: dividerThickness, height: bounds.height)
            : NSRect(x: 0, y: f.maxY, width: bounds.width, height: dividerThickness)
    }

    override func draw(_ dirtyRect: NSRect) {
        let visible = shown
        NSColor(hex: Theme.accentHex, alpha: 0.45).setFill()
        for i in visible.dropLast() {
            let g = gap(after: i)
            (isVertical ? NSRect(x: g.midX - 0.75, y: g.minY, width: 1.5, height: g.height)
                        : NSRect(x: g.minX, y: g.midY - 0.75, width: g.width, height: 1.5)).fill()
        }
    }

    override func resetCursorRects() {
        for i in shown.dropLast() { addCursorRect(gap(after: i), cursor: isVertical ? .resizeLeftRight : .resizeUpDown) }
    }

    /// Moves the divider after pane `k` to `position` (points from the left, or from the top), within both panes' room.
    func setPosition(_ position: CGFloat, ofDividerAt k: Int) {
        guard k + 1 < arrangedSubviews.count else { return }
        let a = arrangedSubviews[k].frame, b = arrangedSubviews[k + 1].frame
        let start = isVertical ? a.minX : a.minY
        let pair = (isVertical ? a.width + b.width : a.height + b.height)
        guard pair > 0 else { return }
        let first = min(max(position - start, minimum), pair - minimum)
        let shareSum = shares[k] + shares[k + 1]
        shares[k] = shareSum * first / pair
        shares[k + 1] = shareSum - shares[k]
        needsLayout = true
    }

    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        dragging = shown.dropLast().first { gap(after: $0).insetBy(dx: -2, dy: -2).contains(p) }
    }

    override func mouseDragged(with event: NSEvent) {
        guard let k = dragging else { return }
        let p = convert(event.locationInWindow, from: nil)
        setPosition((isVertical ? p.x : p.y) - dividerThickness / 2, ofDividerAt: k)
    }

    override func mouseUp(with event: NSEvent) { dragging = nil }
}

/// The window's tabs, under its header when there are two or more, as in iTerm2.
@MainActor
final class PaneTabBar: NSView {
    var onSelect: ((Int) -> Void)?
    var onClose: ((Int) -> Void)?
    private let stack = NSStackView()

    override init(frame: NSRect) {
        super.init(frame: frame)
        stack.orientation = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 4
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor),
            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    func show(titles: [String], active: Int) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (i, t) in titles.enumerated() {
            let chip = TabChip(title: t, number: i + 1, active: i == active)
            chip.onSelect = { [weak self] in self?.onSelect?(i) }
            chip.onClose = { [weak self] in self?.onClose?(i) }
            stack.addArrangedSubview(chip)
        }
    }
}

private final class TabChip: NSView {
    var onSelect: (() -> Void)?
    var onClose: (() -> Void)?
    private let label = NSTextField(labelWithString: "")
    private let close = NSButton(title: "×", target: nil, action: nil)

    init(title: String, number: Int, active: Bool) {
        super.init(frame: .zero)
        wantsLayer = true
        layer?.cornerRadius = 6
        layer?.borderWidth = 1
        layer?.borderColor = NSColor(hex: Theme.accentHex, alpha: active ? 0.75 : 0.22).cgColor
        layer?.backgroundColor = active ? NSColor(hex: Theme.accentHex, alpha: 0.2).cgColor : NSColor.black.withAlphaComponent(0.28).cgColor
        label.stringValue = number <= 9 ? "\(number)  \(title)" : title
        label.font = Theme.mono(11, active ? .semibold : .regular)
        label.textColor = active ? NSColor(hex: 0xFFB057) : NSColor(hex: 0x8F7A66)
        label.lineBreakMode = .byTruncatingTail
        label.alignment = .center
        close.isBordered = false
        close.font = Theme.mono(13, .medium)
        close.contentTintColor = NSColor(hex: active ? 0xFFB057 : 0x8F7A66)
        close.target = self
        close.action = #selector(closeTab)
        close.toolTip = "Close Tab"
        for v in [label, close] as [NSView] {
            v.translatesAutoresizingMaskIntoConstraints = false
            addSubview(v)
        }
        NSLayoutConstraint.activate([
            label.centerYAnchor.constraint(equalTo: centerYAnchor),
            label.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 22),
            label.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -22),
            close.centerYAnchor.constraint(equalTo: centerYAnchor),
            close.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -5),
            close.widthAnchor.constraint(equalToConstant: 16),
        ])
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func mouseDown(with event: NSEvent) { onSelect?() }
    @objc private func closeTab() { onClose?() }
}
