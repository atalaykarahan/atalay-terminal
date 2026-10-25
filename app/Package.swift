// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "atalay-terminal",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "atalay-terminal", targets: ["AtalayTerminal"]),
    ],
    dependencies: [
        .package(url: "https://github.com/migueldeicaza/SwiftTerm", from: "1.20.0"),
    ],
    targets: [
        .executableTarget(
            name: "AtalayTerminal",
            dependencies: [.product(name: "SwiftTerm", package: "SwiftTerm")],
            path: "Sources/AtalayTerminal"
        ),
    ]
)
