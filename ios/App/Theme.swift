// Matches the web app's dark palette (src/index.css, `data-theme="dark"`).

import SwiftUI

enum Theme {
    static let bg = Color(red: 0.055, green: 0.055, blue: 0.063)      // #0e0e10
    static let surface = Color(red: 0.090, green: 0.090, blue: 0.102) // #17171a
    static let fg = Color(red: 0.949, green: 0.949, blue: 0.949)      // #f2f2f2
    static let muted = Color(red: 0.545, green: 0.545, blue: 0.576)   // #8b8b93
    static let line = Color(red: 0.165, green: 0.165, blue: 0.180)    // #2a2a2e
    static let accent = Color(red: 0.847, green: 0.706, blue: 0.416)  // #d8b46a
    static let danger = Color(red: 0.878, green: 0.424, blue: 0.376)  // #e06c60
}
