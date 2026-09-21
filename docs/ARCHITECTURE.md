# Architecture

A free-form calculator on an infinite canvas. Write anywhere, drag expressions where you like, click a result to link it into what you're writing. Change a number and everything downstream updates. Runs on web (Vite + React), iOS/macOS (SwiftUI), and watchOS (SwiftUI). The parser and evaluator are implemented twice: once in JavaScript and once in Swift, pinned to the same test fixtures so they never diverge.

## How it runs

**Web:** User navigates to numen.heyitsmejosh.com. React component mounts, loads the sheet from `localStorage` (or starts blank). Parser tokenizes and parses expressions. Evaluator walks the sheet's dependency graph and computes each node's value. Sheet state updates when the user edits text, moves nodes, or toggles graph mode. No server backend.

**iOS/macOS:** App launches, initializes the sheet from `UserDefaults`. SwiftUI views render nodes as draggable cards. Parser and evaluator are Swift implementations of the same grammar and algorithms as the web version. Sheet persists to `UserDefaults` on every change.

**watchOS:** Simplified card view. Taps drill into a detail sheet. Same parser and evaluator as the main app.

**TUI:** SwiftPM executable takes an expression as a command-line argument, parses it, and evaluates it. Prints the result.

## Parsing and evaluation

The parser is a recursive-descent implementation supporting `+ - * / ^ ( )`, numbers (including `.5`), the variable `x` (for graphing), single-argument functions (sqrt, sin, log, etc.), constants (pi, e, tau), and `@id` references to another node's result. Both implementations must stay in lockstep; divergence is a bug.

| File | What it owns |
|---|---|
| `src/lib/parse.js` | Tokenizes and parses expressions via recursive descent. Exports `tokenize()`, `parse()`, `FUNCTIONS` lookup, `CONSTANTS`, `refs()` (list of `@id` references), and `evalAst()` (evaluate an AST given a variable/reference lookup function). Pinned to `src/lib/sheet.test.js` fixtures so the Swift parser cannot drift silently. |
| `ios/App/Parser.swift` | Line-for-line port of `src/lib/parse.js`. Exports the same functions and behavior. Pinned to `ios/Checks/main.swift` which mirrors the JS test suite. Divergences from the JS are bugs. |
| `src/lib/sheet.js` | The document model: a bag of nodes (expression + position + label + graph flag), pure with no React. `emptySheet()` creates a blank sheet. `addNode()`, `update()`, and `removeNode()` immutably edit the sheet. `evaluate()` walks the dependency graph once with cycle detection (a cycle yields NaN). `dependents()` lists nodes that reference a given node (used for link highlights). `load()` and `save()` handle localStorage persistence. |
| `ios/App/Store.swift` | Mirror of the JS sheet model for SwiftUI. `Sheet` struct with `nodes`. Methods for `addNode()`, `update()`, `removeNode()`, `evaluate()`, `dependents()`. Persists to `UserDefaults`. |
| `src/lib/sheet.test.js` | Test suite for the parser and evaluator. Covers edge cases in parsing (precedence, associativity, implicit multiplication), parsing errors, evaluation, cycles, formatting, and persistence. `node --test`. |
| `ios/Checks/main.swift` | Mirrors `src/lib/sheet.test.js`. Runs the same test vectors through the Swift parser/evaluator so the two implementations stay synchronized. Run `swift build && ./.build/debug/numen-checks`. |

## Web

| File | What it owns |
|---|---|
| `src/components/Canvas.jsx` | Main interactive canvas. Renders nodes as draggable cards. Listens for text edits, drag-to-move, and click-to-link. Calls `sheet.addNode()` when the user clicks to add. Calls `sheet.update()` when text changes. |
| `src/components/Card.jsx` | Single draggable node. Shows expression, computed value, label (optional), and graph (if enabled). Drag responder via `onMouseDown` + `onMouseMove` + `onMouseUp` without a library. |
| `src/components/Graph.jsx` | Inline SVG plot. Takes a node's AST and plots it by evaluating the expression at many `x` values. Draws axes and the curve. Clipped to the card's bounds. |
| `src/App.jsx` | React app root. Manages sheet state. Renders the canvas and a toolbar (new expression, clear all, settings). |
| `src/main.jsx` | Vite entry point. Mounts `App` to `#root`. |
| `src/App.css` | App styling. Dark theme with the Numen brand colors. Card layout, typography, interactions. |
| `index.html` | Static HTML root. Vite injects scripts here. Contains `<div id="root">` where the React app mounts. |
| `public/sw.js` | Service worker. Caches the app shell for offline use. `register()` called from the app. |
| `landing/` | Marketing landing page. `index.html` is the page itself, wrapped in device frames. `devices.css` styles the iPhone/macOS/watchOS device containers. `parse.js` is a stripped-down parser demo for the landing. |
| `vite.config.js` | Vite build config. Outputs to `dist/`. |
| `package.json` + `package-lock.json` | NPM dependencies: React, Vite, testing tools. |

## iOS / macOS / watchOS

| File | What it owns |
|---|---|
| `ios/App/NumenApp.swift` | Entry point for iOS and macOS. Single `WindowGroup` containing `ContentView()`. macOS gets a default 1100x760 window. Share button in the overlay. Prefers dark color scheme. |
| `ios/App/ContentView.swift` | Root view for iOS/macOS. `ZStack` of canvas and toolbar. Uses `@State` for sheet, selection, and sheet editing. Drag responders on the canvas. |
| `ios/App/GraphView.swift` | SwiftUI view for the inline SVG graph. Evaluates the expression at many `x` values and draws the curve. Clips to the card's bounds. |
| `ios/App/Sheet.swift` | Mirror of `src/lib/sheet.js` for Swift. Document model with `addNode()`, `update()`, `removeNode()`, `evaluate()`, `dependents()`. Persists to `UserDefaults`. |
| `ios/App/Store.swift` | Reactive sheet store for SwiftUI. `@Observable` so edits trigger view updates. |
| `ios/App/Theme.swift` | Design tokens. Colors, typography, spacing. Dark theme only. |
| `watchos/NumenWatchApp.swift` | watchOS entry point. Single `WindowGroup` with `ContentView`. |
| `watchos/ContentView.swift` | Simplified watchOS view. Card list instead of a draggable canvas. Tap a card to see its details in a sheet. |
| `tui/main.swift` | CLI tool. Takes an expression as an argument, parses it, evaluates it, and prints the result. Reads `ios/App/Parser.swift` directly with no duplication. |
| `Package.swift` | Swift Package Manager manifest. iOS, macOS, and watchOS targets. TUI executable target. Tests target (`ios/Checks/main.swift`). |

## Kotlin Multiplatform

Note: Numen has no KMP implementation yet. When added, it will mirror the JavaScript and Swift parsers in Kotlin, sharing the same test vectors.

## External services

None. Sheets live in `localStorage` (web) or `UserDefaults` (iOS/macOS/watchOS) only. No backend, no sync. If the same sheet needs to open on multiple devices, swap the storage layer for a KV-backed API route.

## Gotchas

- **Parser lockstep:** `src/lib/parse.js` and `ios/App/Parser.swift` must stay perfectly synchronized. Both are pinned by the same test fixtures in `src/lib/sheet.test.js` and `ios/Checks/main.swift`. Any divergence is a bug, not an improvement.
- **Log function:** `log` is the natural logarithm (matching mathjs). Changing this in one parser without changing it in the other will make plots disagree between web and native.
- **Cycles:** A node that (directly or indirectly) references itself returns NaN. The evaluator detects cycles with an in-progress set, not recursion limits.
- **Implicit multiplication:** `2x` parses as `2 * x`, and `2(3+4)` parses as `2 * (3+4)`. The parser handles this in the term rule.
- **Right-associative exponentiation:** `2^3^2` parses as `2^(3^2)` = 512, not `(2^3)^2` = 64. The exponent recurses through unary so `-3^2` is `-(3^2)` not `(-3)^2`.
