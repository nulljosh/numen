# Numen

Free-form calculator on an infinite canvas. Live at numen.heyitsmejosh.com.

- `src/` is Vite + React. `src/lib` is the parser and evaluator (cycle-safe sheets), `src/components` the draggable cards and SVG graphing
- `ios/` SwiftUI, `kmp/` a real Kotlin port of the parser and evaluator (2026-09-04), `landing/` the marketing page
- Sheets persist in localStorage only. No backend, keep it that way
- Deploy: build then `wrangler pages deploy dist`
