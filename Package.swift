// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "numen-tui",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/rensbreur/SwiftTUI", branch: "main")
    ],
    targets: [
        .executableTarget(
            name: "numen-tui",
            dependencies: ["SwiftTUI"],
            path: ".",
            sources: ["ios/App/Parser.swift", "tui/main.swift"]
        )
    ]
)
