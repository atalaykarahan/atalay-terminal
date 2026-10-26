// Draws the 1024px app icon: Atalay's logo (tools/icon-logo.png) centred on a dark, starry squircle with a soft glow.
// The logo file has empty space around the mark, so it is cropped to its visible pixels first. The staging build's
// icon has a cyan mark and a yellow STAGING sash, so it never passes for the installed app.
// Usage: swift tools/make-icon.swift tools/icon-logo.png out.png [staging]
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

func rgb(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(srgbRed: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: a)
}

let args = CommandLine.arguments
let staging = args.count == 4 && args[3] == "staging"
guard args.count == 3 || staging, let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
      let logo = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    FileHandle.standardError.write(Data("usage: swift tools/make-icon.swift logo.png out.png [staging]\n".utf8))
    exit(2)
}
let accent: UInt32 = staging ? 0x00E5FF : 0xF88008

// Bounding box of the logo's visible pixels (rows top-down, as `cropping(to:)` expects).
let lw = logo.width, lh = logo.height
var pixels = [UInt8](repeating: 0, count: lw * lh * 4)
let scan = CGContext(data: &pixels, width: lw, height: lh, bitsPerComponent: 8, bytesPerRow: lw * 4,
                     space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
scan.draw(logo, in: CGRect(x: 0, y: 0, width: lw, height: lh))
var minX = lw, minY = lh, maxX = -1, maxY = -1
for y in 0..<lh {
    for x in 0..<lw where pixels[(y * lw + x) * 4 + 3] > 16 {
        minX = min(minX, x); maxX = max(maxX, x)
        minY = min(minY, y); maxY = max(maxY, y)
    }
}
let cropped = logo.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1))!

// The mark in one colour, keeping its shape.
func tinted(_ image: CGImage, _ hex: UInt32) -> CGImage {
    let r = CGRect(x: 0, y: 0, width: image.width, height: image.height)
    let ctx = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(image, in: r)
    ctx.setBlendMode(.sourceIn)
    ctx.setFillColor(rgb(hex))
    ctx.fill(r)
    return ctx.makeImage()!
}
let mark = staging ? tinted(cropped, accent) : cropped

let size = 1024
let cg = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0,
                   space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let c = CGPoint(x: 512, y: 512)

// macOS icon grid: an 824px rounded square with a drop shadow.
let inset: CGFloat = 100
let squircle = CGPath(roundedRect: CGRect(x: inset, y: inset, width: 1024 - 2 * inset, height: 1024 - 2 * inset),
                      cornerWidth: 186, cornerHeight: 186, transform: nil)
cg.saveGState()
cg.setShadow(offset: CGSize(width: 0, height: -14), blur: 34, color: rgb(0x000000, 0.55))
cg.addPath(squircle)
cg.setFillColor(rgb(0x0A0705))
cg.fillPath()
cg.restoreGState()

cg.saveGState()
cg.addPath(squircle)
cg.clip()
let bg = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [rgb(0x2A1405), rgb(0x110904), rgb(0x050302)] as CFArray,
                    locations: [0, 0.55, 1])!
cg.drawRadialGradient(bg, startCenter: c, startRadius: 0, endCenter: c, endRadius: 600, options: [.drawsAfterEndLocation])
// Night sky: two faint nebulae, a field of small stars, a few glowing ones in the dashboard's status colours and
// three sparkles. Fixed seed, so every build draws the same sky.
var seed: UInt64 = 0x5EED_A7A1_2026
func rnd() -> CGFloat {
    seed = seed &* 6364136223846793005 &+ 1442695040888963407
    return CGFloat(seed >> 33) / CGFloat(UInt64(1) << 31)
}
for (center, hex, radius, alpha) in [(CGPoint(x: 290, y: 730), 0x9D6BFF, 400.0, 0.16), (CGPoint(x: 740, y: 300), accent, 430.0, 0.13)]
    as [(CGPoint, UInt32, CGFloat, CGFloat)] {
    let g = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: [rgb(hex, alpha), rgb(hex, 0)] as CFArray, locations: [0, 1])!
    cg.drawRadialGradient(g, startCenter: center, startRadius: 0, endCenter: center, endRadius: radius, options: [])
}
for _ in 0..<180 {
    let p = CGPoint(x: inset + rnd() * (1024 - 2 * inset), y: inset + rnd() * (1024 - 2 * inset))
    let r = 0.9 + pow(rnd(), 3) * 2.4
    cg.setFillColor(rgb(rnd() < 0.3 ? 0xFFC98A : 0xFFF6EC, 0.22 + rnd() * 0.6))
    cg.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
}
cg.saveGState()
for _ in 0..<8 {
    let p = CGPoint(x: inset + 30 + rnd() * (1024 - 2 * inset - 60), y: inset + 30 + rnd() * (1024 - 2 * inset - 60))
    let r = 2.4 + rnd() * 1.6
    cg.setShadow(offset: .zero, blur: 12, color: rgb(0xFFF6EC, 0.9))
    cg.setFillColor(rgb(0xFFFFFF, 0.95))
    cg.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
}
for (p, hex, r) in [(CGPoint(x: 420, y: 858), 0x00E5FF, 7.0), (CGPoint(x: 168, y: 452), 0x9D6BFF, 6.5),
                    (CGPoint(x: 566, y: 170), 0xFF2E63, 5.5), (CGPoint(x: 878, y: 560), 0xFFD23F, 6.0)] as [(CGPoint, UInt32, CGFloat)] {
    cg.setShadow(offset: .zero, blur: 20, color: rgb(hex, 0.95))
    cg.setFillColor(rgb(hex))
    cg.fillEllipse(in: CGRect(x: p.x - r, y: p.y - r, width: r * 2, height: r * 2))
}
// Four-pointed sparkles where the logo leaves the sky empty.
for (p, l) in [(CGPoint(x: 250, y: 772), 30.0), (CGPoint(x: 838, y: 246), 22.0), (CGPoint(x: 846, y: 836), 15.0)] as [(CGPoint, CGFloat)] {
    let w = l * 0.16
    let star = CGMutablePath()
    star.move(to: CGPoint(x: p.x, y: p.y + l))
    star.addLine(to: CGPoint(x: p.x + w, y: p.y + w)); star.addLine(to: CGPoint(x: p.x + l, y: p.y))
    star.addLine(to: CGPoint(x: p.x + w, y: p.y - w)); star.addLine(to: CGPoint(x: p.x, y: p.y - l))
    star.addLine(to: CGPoint(x: p.x - w, y: p.y - w)); star.addLine(to: CGPoint(x: p.x - l, y: p.y))
    star.addLine(to: CGPoint(x: p.x - w, y: p.y + w))
    star.closeSubpath()
    cg.setShadow(offset: .zero, blur: 16, color: rgb(0xFFE2BF, 0.95))
    cg.addPath(star)
    cg.setFillColor(rgb(0xFFF8F0))
    cg.fillPath()
}
cg.restoreGState()

// A thin inner rim catches the light, like the dashboard's glass panels.
cg.addPath(CGPath(roundedRect: CGRect(x: inset + 3, y: inset + 3, width: 1024 - 2 * inset - 6, height: 1024 - 2 * inset - 6),
                  cornerWidth: 183, cornerHeight: 183, transform: nil))
cg.setStrokeColor(rgb(accent, 0.22))
cg.setLineWidth(4)
cg.strokePath()

// The mark, as large as fits in 62% of the square, centred on its visible pixels.
let box: CGFloat = 824 * 0.62
let scale = min(box / CGFloat(mark.width), box / CGFloat(mark.height))
let mw = CGFloat(mark.width) * scale, mh = CGFloat(mark.height) * scale
cg.setShadow(offset: .zero, blur: 42, color: rgb(accent, 0.55))
cg.interpolationQuality = .high
cg.draw(mark, in: CGRect(x: c.x - mw / 2, y: c.y - mh / 2, width: mw, height: mh))

// Staging: a yellow sash across the top-right corner.
if staging {
    cg.saveGState()
    cg.translateBy(x: 1024 - inset - 140, y: 1024 - inset - 140)
    cg.rotate(by: -.pi / 4)
    cg.setShadow(offset: CGSize(width: 0, height: -6), blur: 18, color: rgb(0x000000, 0.5))
    cg.setFillColor(rgb(0xFFD23F))
    cg.fill(CGRect(x: -420, y: -62, width: 840, height: 124))
    cg.setShadow(offset: .zero, blur: 0, color: nil)
    let attrs: [NSAttributedString.Key: Any] = [
        NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("Menlo-Bold" as CFString, 64, nil),
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): rgb(0x1A0D00),
        NSAttributedString.Key(kCTKernAttributeName as String): 5,
    ]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: "STAGING", attributes: attrs))
    let b = CTLineGetBoundsWithOptions(line, .useOpticalBounds)
    cg.textPosition = CGPoint(x: -b.width / 2 - b.minX, y: -b.height / 2 - b.minY)
    CTLineDraw(line, cg)
    cg.restoreGState()
}
cg.restoreGState()

let out = URL(fileURLWithPath: args[2])
let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, cg.makeImage()!, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }
