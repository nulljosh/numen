// The document model: a bag of nodes, each an expression placed somewhere on the canvas.
// Pure — no React, no DOM. evaluate() is a single memoized pass over the whole sheet.

import { parse, refs, evalAst } from './parse.js';

export const emptySheet = () => ({ nextId: 1, nodes: [] });

export function addNode(sheet, { x = 40, y = 40, text = '', label = '', graph = false } = {}) {
  const id = String(sheet.nextId);
  const node = compile({ id, x, y, text, label, graph });
  return [evaluate({ ...sheet, nextId: sheet.nextId + 1, nodes: [...sheet.nodes, node] }), id];
}

function compile(node) {
  if (!node.text.trim()) return { ...node, ast: null, error: null };
  try {
    return { ...node, ast: parse(node.text), error: null };
  } catch (e) {
    return { ...node, ast: null, error: e.message };
  }
}

export function update(sheet, id, patch) {
  const nodes = sheet.nodes.map((n) => {
    if (n.id !== id) return n;
    const next = { ...n, ...patch };
    return 'text' in patch ? compile(next) : next;
  });
  return evaluate({ ...sheet, nodes });
}

export function removeNode(sheet, id) {
  return evaluate({ ...sheet, nodes: sheet.nodes.filter((n) => n.id !== id) });
}

/**
 * Recompute every value. Depth-first with an in-progress marker, so a reference cycle
 * yields NaN instead of recursing forever.
 */
export function evaluate(sheet) {
  const byId = new Map(sheet.nodes.map((n) => [n.id, n]));
  const done = new Map();
  const inProgress = new Set();

  function valueOf(id) {
    if (done.has(id)) return done.get(id);
    if (inProgress.has(id)) return NaN; // cycle
    const n = byId.get(id);
    if (!n || !n.ast) return NaN;
    inProgress.add(id);
    const v = evalAst(n.ast, valueOf);
    inProgress.delete(id);
    done.set(id, v);
    return v;
  }

  return { ...sheet, nodes: sheet.nodes.map((n) => ({ ...n, value: n.ast ? valueOf(n.id) : null })) };
}

/** ids that would break if `id` changed — used to draw the link highlights */
export function dependents(sheet, id) {
  return sheet.nodes.filter((n) => n.ast && refs(n.ast).has(id)).map((n) => n.id);
}

export function format(v) {
  if (v === null || v === undefined) return '';
  if (!Number.isFinite(v)) return Number.isNaN(v) ? '—' : v > 0 ? '∞' : '-∞';
  const r = Math.round(v * 1e10) / 1e10;
  return Math.abs(r) >= 1e12 || (r !== 0 && Math.abs(r) < 1e-6) ? r.toExponential(4) : String(r);
}

const KEY = 'numen.sheet.v1';

// ponytail: localStorage only — single device, no sync. Swap for a KV-backed
// functions/api route when the same sheet needs to open on a second device.
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return evaluate({ ...s, nodes: s.nodes.map(compile) });
  } catch {
    return null;
  }
}

export function save(sheet) {
  try {
    const nodes = sheet.nodes.map(({ id, x, y, text, label, graph }) => ({ id, x, y, text, label, graph }));
    localStorage.setItem(KEY, JSON.stringify({ nextId: sheet.nextId, nodes }));
  } catch { /* private mode, quota — the sheet still works in memory */ }
}
