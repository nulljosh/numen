import { useMemo } from 'react';
import { evalAst } from '../lib/parse.js';

const W = 240, H = 140, PAD = 6, SAMPLES = 120;

/** Plots the node's expression over x, live: it re-samples whenever any input changes. */
export default function Graph({ ast, lookup, from = -10, to = 10 }) {
  const { path, lo, hi } = useMemo(() => {
    const pts = [];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const x = from + ((to - from) * i) / (SAMPLES - 1);
      const y = evalAst(ast, lookup, { x });
      if (Number.isFinite(y)) { pts.push([x, y]); if (y < lo) lo = y; if (y > hi) hi = y; }
    }
    if (!pts.length) return { path: '', lo: 0, hi: 0 };
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const sx = (x) => PAD + ((x - from) / (to - from)) * (W - 2 * PAD);
    const sy = (y) => H - PAD - ((y - lo) / (hi - lo)) * (H - 2 * PAD);
    return { path: pts.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join(' '), lo, hi };
  }, [ast, lookup, from, to]);

  return (
    <svg className="graph" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="graph of the expression">
      <polyline className="graph-line" points={path} fill="none" />
      <text className="graph-tick" x={PAD} y={12}>{Number.isFinite(hi) ? hi.toPrecision(3) : ''}</text>
      <text className="graph-tick" x={PAD} y={H - 2}>{Number.isFinite(lo) ? lo.toPrecision(3) : ''}</text>
    </svg>
  );
}
