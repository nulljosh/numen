# Numen Technical Whitepaper

**v1.0.1** | September 2026

A calculator with no rows.

A row-based calculator forces every calculation into a single ordered list,
which is fine for one sum and wrong for working through several related ones
at once. Numen is an infinite canvas, a rebuild of Tydlig, the iOS app that was discontinued,
because that free-form layout was worth keeping even after the original app wasn't.
Write an expression anywhere. Drag it. Click a result to link it into what you're
typing. Any expression can plot itself over `x`. Live at
[numen.heyitsmejosh.com](https://numen.heyitsmejosh.com).

## Core Mechanic: Linked Results

Every card is an expression. Clicking another card's result inserts a
reference token `@id` into the current expression, so a calculation can reuse
another's answer without retyping or recopying a number by hand. The document is therefore
a dependency graph, and editing one card recalculates everything downstream,
the same way a spreadsheet cell change ripples through its formulas.

`src/lib/sheet.js` owns that graph. On edit it re-parses the changed card,
then walks dependents in topological order. Cycles are detected during the
walk and the offending cards show an error rather than hanging or
recursing forever, because a circular reference is a user mistake, not a
crash.

## Parser

`src/lib/parse.js` is a recursive-descent parser over `+ - * / ^ ( )`,
numeric literals, the free variable `x`, and `@id` links. It returns an AST
that is evaluated with an environment `{ x, links }`. No `eval`, no math
library, because evaluating arbitrary user text with `eval` is a needless
security hole for what's really a small, fixed grammar. Precedence and right-associative `^` are handled by the grammar.

## Graphing

`src/components/Graph.jsx` samples the expression across a visible `x` range
and renders an inline SVG polyline. No chart library, since a single
polyline over one variable doesn't need one. Cards with no `x`
simply have no plot button, because there's nothing to sweep across.

## Stack

Vite 6 + React 19. Dragging is pointer events on the card, no drag library.
Layout and expressions persist in `localStorage`.

```
npm i && npm test   # 7 tests over the parser + link cascade
npm run dev
```

## License

MIT 2026, Joshua Trommel
