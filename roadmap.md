# Numen roadmap

## Shipped (2026-08-30)
- Canvas: click to create, drag to place, sheet persisted to localStorage
- Linked numbers: click a result to insert `@id`; edits cascade through every dependent
- Text labels per expression
- Live SVG graph of any expression over `x`
- Parser + sheet unit tests (`npm test`)

## Shipped (2026-08-31)
- Operator precedence fixed: unary minus now binds looser than `^`, so `-3^2` is -9 rather
  than 9. It was wrong in both engines and a test pinned the wrong answer.
- Parser gained single-argument functions (sqrt, sin/cos/tan, log/ln, exp, floor, round,
  abs, sign, ...), the constants pi/e/tau, implicit multiplication against a name/ref/paren
  (`4x`, `2(3+4)`, `2pi`, but never `2 3`), and leading-dot literals. Web and Swift engines
  verified to agree on 34 expressions including the infinities.
- Native iOS + macOS SwiftUI apps in `ios/`, one xcodegen target, two destinations,
  charwork's template. `parse.js` and `sheet.js` ported to `Parser.swift`/`Sheet.swift`;
  the JS tests ported to `ios/Checks/main.swift` (23 asserts, run with `swiftc`, no XCTest).
  Both platforms build clean; the Mac app was run and verified against the starter sheet.
- Landing page at / (bookrank style), app at /app. Fixed hero expression wall (was showing
  unparseable operators: sqrt, sin, log, %, π); replaced with 25 real expressions. Added
  Mac + iPhone screenshots. Deployed live at numen.heyitsmejosh.com.

## Next
- **Blocked:** App Store name check for "Numen" via the asc-name-creator skill. No ASC
  record exists yet and none should be created until the name is confirmed available.
- Native gaps vs the web app, both called out in `ContentView.swift`: linking appends
  `@id` at the end of the expression instead of at the caret (SwiftUI's TextField exposes
  no selection range), and cards drag by a grip rather than anywhere on the card.
- App icon is currently the landing-page mark rendered square. Worth a real icon pass.
- Functions take one argument only. `min`/`max`/`atan2` need a comma-argument list.
- Scrub a number by dragging on the digit itself (Tydlig's other signature gesture)
- Units (`5 km + 300 m`) and a custom keypad for touch
- Undo/redo
- Multi-device sync, replace localStorage with a KV-backed `functions/api` route
- Custom domain: live at https://numen.heyitsmejosh.com. Shipped as a Worker with static assets, not Pages, because the Pages custom-domain API rejects both the DNS token and wrangler OAuth; `wrangler deploy` attaches the domain itself from the `[[routes]] custom_domain` line.
