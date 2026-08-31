# Numen roadmap

## Shipped (2026-08-30)
- Canvas: click to create, drag to place, sheet persisted to localStorage
- Linked numbers: click a result to insert `@id`; edits cascade through every dependent
- Text labels per expression
- Live SVG graph of any expression over `x`
- Parser + sheet unit tests (`npm test`)

## Shipped (2026-08-31)
- Native iOS + macOS SwiftUI apps in `ios/` — one xcodegen target, two destinations,
  charwork's template. `parse.js` and `sheet.js` ported to `Parser.swift`/`Sheet.swift`;
  the JS tests ported to `ios/Checks/main.swift` (23 asserts, run with `swiftc`, no XCTest).
  Both platforms build clean; the Mac app was run and verified against the starter sheet.
- Landing page at / (bookrank style), app at /app. Fixed hero expression wall (was showing
  unparseable operators: sqrt, sin, log, %, π); replaced with 25 real expressions. Added
  Mac + iPhone screenshots. Deployed live at numen.heyitsmejosh.com.

## Next
- **Blocked:** App Store name check for "Numen" via the asc-name-creator skill. No ASC
  record exists yet and none should be created until the name is confirmed available.
- Decide whether `-3^2` should stay `(-3)^2 = 9`. Numen binds unary minus tighter than `^`,
  which is the opposite of standard math notation and of what most calculators do. The
  native port deliberately matches the web app; `ios/Checks/main.swift` pins it, so
  changing it means changing both.
- Native gaps vs the web app, both called out in `ContentView.swift`: linking appends
  `@id` at the end of the expression instead of at the caret (SwiftUI's TextField exposes
  no selection range), and cards drag by a grip rather than anywhere on the card.
- App icon is currently the landing-page mark rendered square. Worth a real icon pass.
- Scrub a number by dragging on the digit itself (Tydlig's other signature gesture)
- Units (`5 km + 300 m`) and a custom keypad for touch
- Undo/redo
- Multi-device sync — replace localStorage with a KV-backed `functions/api` route
- Custom domain: live at https://numen.heyitsmejosh.com. Shipped as a Worker with static assets, not Pages, because the Pages custom-domain API rejects both the DNS token and wrangler OAuth; `wrangler deploy` attaches the domain itself from the `[[routes]] custom_domain` line.
