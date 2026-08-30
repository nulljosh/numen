# Numen

A free-form calculator on an infinite canvas — a rebuild of the interaction model from
Tydlig (iOS, discontinued). Write expressions anywhere, drag them around, and click any
result to **link** it into the expression you're editing. Change something upstream and
everything downstream recalculates. Any expression can also plot itself over `x`.

- `src/lib/parse.js` — recursive-descent parser (`+ - * / ^ ( )`, numbers, `x`, `@id` links)
- `src/lib/sheet.js` — the document model: evaluate, edit, cycle-safe dependency walk
- `src/App.jsx` — the canvas
- `src/components/Graph.jsx` — inline SVG plot

No math library, no drag library, no chart library.

```
npm i && npm test   # 7 tests over the parser + link cascade
npm run dev
```
