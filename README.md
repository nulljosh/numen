<img src="public/icon.svg" width="56" height="56" alt="Numen icon">

# Numen

![version](https://img.shields.io/badge/version-v1.0.1-blue) ![license](https://img.shields.io/badge/license-MIT-green) [![GitHub](https://img.shields.io/badge/GitHub-nulljosh%2Fnumen-black?logo=github)](https://github.com/nulljosh/numen)


**Live:** https://numen.heyitsmejosh.com

A calculator with no rows. Write anywhere on an infinite canvas.

This is a rebuild of Tydlig, the iOS app that was discontinued. Type an expression, drag
it where you like, click any result to **link** it into what you're writing. Change a number
upstream and everything downstream follows. Any expression can plot itself over `x`.

| macOS | iOS |
|---|---|
| <img src="landing/shot-mac.png" width="420" alt="Numen on macOS"> | <img src="landing/shot-ios.png" width="180" alt="Numen on iOS"> |

- `src/lib/parse.js`: recursive-descent parser. `+ - * / ^ ( )`, numbers, `x`, `@id` links
- `src/lib/sheet.js`: the document. Evaluate, edit, walk dependencies without looping
- `src/App.jsx`: the canvas
- `src/components/Graph.jsx`: inline SVG plot

No math library. No drag library. No chart library.

```
npm i && npm test   # 7 tests over the parser + link cascade
npm run dev
```

**Terminal:** `swift build && ./.build/debug/numen-tui "2+2*sqrt(9)"` — see [tui/](tui/)
