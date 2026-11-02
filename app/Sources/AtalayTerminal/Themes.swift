import AppKit
import SwiftUI
import WebKit

/// A colour theme: the terminals' palette (background, text, cursor, selection and the 16 ANSI colours) and an accent.
/// The app's other colours are made from these (`ThemeStore.derive`); the default theme lists its own exact values in
/// `ui`, which overrides what would be made. The themes are Resources/web/themes/themes.json, the default first.
struct ThemeSpec: Decodable {
    let id: String
    let name: String
    let bg: String
    let fg: String
    let cursor: String
    let selection: String
    let accent: String
    let ansi: [String]
    let ui: [String: String]?
}

/// The theme the app shows and its colours as named tokens: the CSS variables of web/style.css, plus the terminals'
/// own. They reach the web pages as a style sheet written before each page loads (and replaced when the theme changes),
/// the terminals and the native views through `ThemeStore.changed`. The orbit map keeps the default theme's colours:
/// the sheet sets them again on #mapwrap.
final class ThemeStore: ObservableObject {
    static let shared = ThemeStore()
    static let changed = Notification.Name("ThemeStore.changed")
    private static let key = "theme"
    private static let marker = "/* atalay-theme */"

    let themes: [ThemeSpec]
    /// What the app shows: the chosen theme, or the one the theme screen previews.
    @Published private(set) var current: ThemeSpec
    private(set) var tokens: [String: String] = [:]
    private var values: [String: UInt32] = [:]
    private var made: [String: [String: String]] = [:]
    private let pages = NSHashTable<WKWebView>.weakObjects()

    private init() {
        let url = RadarView.webDirectory().appendingPathComponent("themes/themes.json")
        var list = (try? JSONDecoder().decode([ThemeSpec].self, from: Data(contentsOf: url))) ?? []
        if list.isEmpty {
            NSLog("themes: %@ unreadable, default colours only", url.path)
            list = [ThemeSpec(id: "atalay", name: "Atalay", bg: "#251200", fg: "#f5ebe0", cursor: "#f88008", selection: "#f88008",
                              accent: "#f88008", ansi: Self.fallbackAnsi, ui: nil)]
        }
        themes = list
        let saved = UserDefaults.standard.string(forKey: Self.key)
        current = list.first { $0.id == saved } ?? list[0]
        load()
    }

    var chosenId: String { UserDefaults.standard.string(forKey: Self.key).flatMap { id in themes.first { $0.id == id }?.id } ?? themes[0].id }

    /// The theme screen: `preview` shows a theme without keeping it, `choose` keeps it, `revert` goes back to the kept one.
    func preview(_ id: String) { show(id) }
    func choose(_ id: String) {
        guard themes.contains(where: { $0.id == id }) else { return }
        UserDefaults.standard.set(id, forKey: Self.key)
        show(id)
    }
    func revert() { show(chosenId) }

    private func show(_ id: String) {
        guard let spec = themes.first(where: { $0.id == id }), spec.id != current.id else { return }
        current = spec
        load()
        let css = Self.jsString(self.css)
        for page in pages.allObjects {
            Self.install(script, in: page.configuration.userContentController)
            page.evaluateJavaScript("window.__theme && window.__theme(\(css)); true", completionHandler: nil)
        }
        NotificationCenter.default.post(name: Self.changed, object: self)
    }

    private func load() {
        tokens = tokens(of: current)
        values = tokens.compactMapValues(Self.parse).mapValues(Self.pack)
    }

    func tokens(of spec: ThemeSpec) -> [String: String] {
        if let t = made[spec.id] { return t }
        var t = Self.derive(spec)
        for (k, v) in spec.ui ?? [:] { t[k] = v }
        made[spec.id] = t
        return t
    }

    // MARK: colours for the native views

    func hex(_ token: String) -> UInt32 { values[token] ?? 0xFF00FF }
    func color(_ token: String, alpha: CGFloat = 1) -> NSColor { NSColor(hex: hex(token), alpha: alpha) }
    func swiftUI(_ token: String, opacity: Double = 1) -> Color { Color(hex: hex(token), opacity: opacity) }

    // MARK: the web pages

    /// Gives a page the theme before it loads and keeps it current. Call before the page loads.
    func attach(_ page: WKWebView) {
        Self.install(script, in: page.configuration.userContentController)
        pages.add(page)
    }

    /// The style sheet: every token on the page's root (above style.css's defaults), and the default theme's again on
    /// the orbit map: the tokens made from others are made there again from the default ones, its text colour is set
    /// again rather than inherited, and the page's background (style.css body), which shows through it, is painted
    /// under it.
    var css: String {
        let decl = { (t: [String: String]) in t.sorted { $0.key < $1.key }.map { "\($0.key):\($0.value);" }.joined() }
        return ":root:root{\(decl(tokens))}#mapwrap#mapwrap{\(decl(tokens(of: themes[0])))"
            + "--panel:rgba(var(--panel-rgb),var(--glass-a));--line:rgba(var(--accent-rgb),0.32);--line-soft:rgba(var(--accent-rgb),0.13);"
            + "color:var(--txt);background:linear-gradient(rgba(var(--bg-rgb),0.6),rgba(var(--bg-rgb),0.6)),"
            + "radial-gradient(ellipse at 50% 40%,var(--bloom) 0%,var(--bg) 70%) fixed}"
    }

    private var script: WKUserScript {
        let source = """
        \(Self.marker)(() => {
          const s = document.createElement('style');
          s.textContent = \(Self.jsString(css));
          document.documentElement.appendChild(s);
          window.__theme = (css) => { s.textContent = css; window.dispatchEvent(new Event('themechange')); };
        })();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
    }

    /// Replaces the page's theme script (pages reload after a crash or ⌘R, and must load with the current theme).
    private static func install(_ script: WKUserScript, in ucc: WKUserContentController) {
        let others = ucc.userScripts.filter { !$0.source.hasPrefix(marker) }
        ucc.removeAllUserScripts()
        others.forEach(ucc.addUserScript)
        ucc.addUserScript(script)
    }

    private static func jsString(_ s: String) -> String {
        (try? JSONSerialization.data(withJSONObject: [s])).flatMap { String(data: $0, encoding: .utf8) }.map { String($0.dropFirst().dropLast()) } ?? "''"
    }

    // MARK: making a theme's tokens

    private static let fallbackAnsi = ["#562f18", "#ff4d4d", "#c5e35a", "#ffd23f", "#c16100", "#e0849c", "#ff7345", "#ffb27a",
                                       "#7d6553", "#ff5c8a", "#ddf08f", "#ffe28a", "#f88008", "#ffa8c4", "#ff9b73", "#fff3e6"]

    /// Every token from the palette, as Warp makes its whole look from a few colours: the surfaces are the terminal's
    /// background darkened, the text's shades lie between its text and background, the meaning colours (red, green,
    /// amber, cyan…) are its ANSI colours, and the lines, highlights and buttons are the accent.
    static func derive(_ s: ThemeSpec) -> [String: String] {
        let black = RGB(0, 0, 0), white = RGB(1, 1, 1)
        let T = parse(s.bg) ?? black, F = parse(s.fg) ?? white, A = parse(s.accent) ?? white
        let N = (0..<16).map { i in i < s.ansi.count ? parse(s.ansi[i]) ?? F : F }
        let same = { (a: RGB, b: RGB) in a.lab.distance(b.lab) < 0.04 }
        // A bright colour that is only a grey (Solarized's are its greys), or the same as the normal one, is the normal
        // one lightened.
        let bright = { (i: Int) -> RGB in
            let n = N[i], b = N[i + 8]
            return b.lab.chroma < n.lab.chroma * 0.5 || same(n, b) ? n.mix(white, 0.18) : b
        }
        var t: [String: RGB] = [:]
        t["bg"] = T.mix(black, 0.45)
        t["deep"] = T.mix(black, 0.8)
        t["surface"] = T.mix(black, 0.32)
        t["panel"] = T.mix(black, 0.18)
        t["glass-top"] = T.mix(A, 0.12)
        t["bloom"] = T.mix(black, 0.12)
        t["accent"] = A
        t["accent-soft"] = A.mix(white, 0.35)
        t["accent-pale"] = A.mix(white, 0.65)
        t["txt"] = F
        t["hi"] = F.mix(white, 0.5)
        t["title"] = F.mix(white, 0.25)
        t["txt2"] = F.mix(T, 0.15)
        t["txt3"] = F.mix(T, 0.3)
        t["dim"] = F.mix(T, 0.45)
        t["faint"] = F.mix(T, 0.58)
        t["dim2"] = F.mix(T, 0.72)
        let dark = T.mix(black, 0.6), light = F.mix(white, 0.6)
        t["ink"] = A.contrast(dark) >= A.contrast(light) ? dark : light
        t["red"] = N[1]
        t["red-soft"] = N[1].mix(white, 0.35)
        t["warn"] = same(N[1], bright(1)) ? N[1].mix(N[5], 0.3) : bright(1)
        t["green"] = N[2]
        t["amber"] = N[3]
        t["blue"] = N[4]
        t["violet"] = N[5]
        // "Your turn" must not look like "working" (the accent): with an accent of the cyan's hue it goes green.
        t["cyan"] = A.lab.hueDistance(N[6].lab) < 30 ? N[2] : N[6]
        t["lime"] = same(N[2], bright(2)) ? N[2].mix(N[3], 0.4) : bright(2)
        t["sky"] = same(N[4], bright(4)) ? N[4].mix(N[6], 0.5) : bright(4)
        t["magenta"] = same(N[5], bright(5)) ? N[5].mix(N[1], 0.3) : bright(5)
        t["orange"] = N[1].mix(N[3], 0.5)
        t["lavender"] = N[5].mix(F, 0.5)
        t["idle-deep"] = t["bg"]!.mix(t["cyan"]!, 0.08)
        t["ended"] = F.mix(T, 0.62)
        t["ended-deep"] = t["dim2"]!.mix(t["bg"]!, 0.6)
        for (i, k) in ["accent-soft", "cyan", "violet", "green", "orange", "blue", "amber", "lime", "magenta", "txt"].enumerated() {
            t["hue\(i)"] = t[k]
        }
        t["code-bg"] = T
        t["code-fg"] = F
        t["code-cursor"] = parse(s.cursor) ?? F
        let sel = parse(s.selection) ?? A
        t["selection"] = sel
        t["selection-text"] = sel.luminance > 0.4 ? T : F
        t["caret-text"] = T
        for i in 0..<16 { t["a\(i)"] = N[i] }

        let onlyRGB: Set = ["deep", "surface", "panel", "glass-top"]
        let alsoRGB: Set = ["bg", "accent", "accent-soft", "violet", "cyan", "warn", "amber", "red", "green", "dim2", "ink"]
        var out: [String: String] = [:]
        for (k, c) in t {
            if !onlyRGB.contains(k) { out["--\(k)"] = c.hex }
            if onlyRGB.contains(k) || alsoRGB.contains(k) { out["--\(k)-rgb"] = c.triplet }
        }
        return out
    }

    // MARK: colour arithmetic (sRGB, mixed in Oklab so the steps look even)

    struct RGB {
        var r, g, b: Double
        init(_ r: Double, _ g: Double, _ b: Double) { (self.r, self.g, self.b) = (r, g, b) }

        var hex: String { String(format: "#%02x%02x%02x", Self.byte(r), Self.byte(g), Self.byte(b)) }
        var triplet: String { "\(Self.byte(r)), \(Self.byte(g)), \(Self.byte(b))" }
        static func byte(_ v: Double) -> Int { Int((min(1, max(0, v)) * 255).rounded()) }

        private static func linear(_ c: Double) -> Double { c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4) }
        private static func gamma(_ c: Double) -> Double { c <= 0.0031308 ? 12.92 * c : 1.055 * pow(c, 1 / 2.4) - 0.055 }

        var luminance: Double { 0.2126 * Self.linear(r) + 0.7152 * Self.linear(g) + 0.0722 * Self.linear(b) }
        func contrast(_ o: RGB) -> Double {
            let (a, b) = (luminance, o.luminance)
            return (max(a, b) + 0.05) / (min(a, b) + 0.05)
        }

        var lab: Lab {
            let (lr, lg, lb) = (Self.linear(r), Self.linear(g), Self.linear(b))
            let l = cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
            let m = cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
            let s = cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
            return Lab(L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                       a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                       b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)
        }

        init(_ lab: Lab) {
            let l = pow(lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b, 3)
            let m = pow(lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b, 3)
            let s = pow(lab.L - 0.0894841775 * lab.a - 1.2914855480 * lab.b, 3)
            self.init(Self.gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
                      Self.gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
                      Self.gamma(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s))
        }

        /// `k` of the way from this colour to `o`.
        func mix(_ o: RGB, _ k: Double) -> RGB {
            let (x, y) = (lab, o.lab)
            return RGB(Lab(L: x.L + (y.L - x.L) * k, a: x.a + (y.a - x.a) * k, b: x.b + (y.b - x.b) * k))
        }
    }

    struct Lab {
        var L, a, b: Double
        var chroma: Double { hypot(a, b) }
        func distance(_ o: Lab) -> Double { sqrt(pow(L - o.L, 2) + pow(a - o.a, 2) + pow(b - o.b, 2)) }
        /// Degrees between two hues, 180 when either is a grey.
        func hueDistance(_ o: Lab) -> Double {
            guard chroma > 0.03, o.chroma > 0.03 else { return 180 }
            let d = abs(atan2(b, a) - atan2(o.b, o.a)) * 180 / .pi
            return d > 180 ? 360 - d : d
        }
    }

    /// "#rrggbb" or "r, g, b".
    static func parse(_ s: String) -> RGB? {
        let v = s.trimmingCharacters(in: .whitespaces)
        if v.hasPrefix("#"), v.count == 7, let n = UInt32(v.dropFirst(), radix: 16) {
            return RGB(Double((n >> 16) & 0xFF) / 255, Double((n >> 8) & 0xFF) / 255, Double(n & 0xFF) / 255)
        }
        let parts = v.split(separator: ",").compactMap { Double($0.trimmingCharacters(in: .whitespaces)) }
        return parts.count == 3 ? RGB(parts[0] / 255, parts[1] / 255, parts[2] / 255) : nil
    }

    private static func pack(_ c: RGB) -> UInt32 { UInt32(RGB.byte(c.r)) << 16 | UInt32(RGB.byte(c.g)) << 8 | UInt32(RGB.byte(c.b)) }
}

/// The page's theme requests (web/cloud.js): the themes with all their colours (the themes view's pictures, and someone's
/// card on the leaderboard drawn in their theme), a preview, a choice, back to the chosen one.
final class ThemeBridge: NSObject, WKScriptMessageHandlerWithReply {
    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let store = ThemeStore.shared
        let id = body["id"] as? String ?? ""
        switch body["type"] as? String {
        case "list":
            let themes = store.themes.map { spec -> [String: Any] in ["id": spec.id, "name": spec.name, "tokens": store.tokens(of: spec)] }
            replyHandler(["themes": themes, "chosen": store.chosenId, "current": store.current.id], nil)
        case "preview": store.preview(id); replyHandler(true, nil)
        case "choose": store.choose(id); replyHandler(true, nil)
        case "revert": store.revert(); replyHandler(true, nil)
        default: replyHandler(nil, "unknown request")
        }
    }
}
