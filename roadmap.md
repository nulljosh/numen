# Numen roadmap

## Shipped (2026-08-30)
- Canvas: click to create, drag to place, sheet persisted to localStorage
- Linked numbers: click a result to insert `@id`; edits cascade through every dependent
- Text labels per expression
- Live SVG graph of any expression over `x`
- Parser + sheet unit tests (`npm test`)

## Next
- iOS/macOS SwiftUI port (copy `charwork/ios/project.yml` as the xcodegen template)
- Scrub a number by dragging on the digit itself (Tydlig's other signature gesture)
- Units (`5 km + 300 m`) and a custom keypad for touch
- Undo/redo
- Multi-device sync — replace localStorage with a KV-backed `functions/api` route
- App Store name check for "Numen" via the asc-name-creator skill before any ASC record
- Custom domain numen.heyitsmejosh.com: the local Cloudflare token is DNS-only, so the Pages custom-domain attach 10000s. Add it in the dashboard, or with a token that has Pages:Edit. Live meanwhile at https://numen-kuq.pages.dev
