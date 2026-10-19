import { useCallback, useEffect, useRef, useState } from 'react';
import { emptySheet, addNode, update, removeNode, dependents, format, load, save } from './lib/sheet.js';
import { evalAst, refs } from './lib/parse.js';
import Graph from './components/Graph.jsx';

const starter = () => {
  let s = emptySheet(), a, b;
  [s, a] = addNode(s, { x: 60, y: 80, text: '1200 * 12', label: 'yearly rent' });
  [s, b] = addNode(s, { x: 60, y: 200, text: `@${a} * 0.3`, label: 'what I could save' });
  return s;
};

export default function App() {
  const [sheet, setSheet] = useState(() => load() ?? starter());
  const [focus, setFocus] = useState(null); // id of the node being typed into
  const inputs = useRef({});

  useEffect(() => { save(sheet); }, [sheet]);

  const lookup = useCallback(
    (id) => {
      const n = sheet.nodes.find((x) => x.id === id);
      return n && n.value !== null ? n.value : NaN;
    },
    [sheet]
  );

  function newNode(e) {
    if (e.target !== e.currentTarget) return; // only bare canvas
    const r = e.currentTarget.getBoundingClientRect();
    const [next, id] = addNode(sheet, { x: e.clientX - r.left + e.currentTarget.scrollLeft - 20, y: e.clientY - r.top + e.currentTarget.scrollTop - 20 });
    setSheet(next);
    setFocus(id);
    requestAnimationFrame(() => inputs.current[id]?.focus());
  }

  /** Tydlig's core move: tapping a result drops a live link to it into the expression you're typing. */
  function link(id) {
    if (!focus || focus === id) return;
    const n = sheet.nodes.find((x) => x.id === focus);
    const el = inputs.current[focus];
    const at = el ? el.selectionStart : n.text.length;
    const text = `${n.text.slice(0, at)}@${id}${n.text.slice(at)}`;
    setSheet(update(sheet, focus, { text }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + 1 + id.length, at + 1 + id.length);
    });
  }

  const linked = focus ? new Set([...dependents(sheet, focus), ...(sheet.nodes.find((n) => n.id === focus)?.ast ? refs(sheet.nodes.find((n) => n.id === focus).ast) : [])]) : new Set();

  return (
    <div className="app">
      <header className="bar">
        <h1>Numen</h1>
        <p>Click anywhere to write. Click another card&apos;s result to link it in — everything downstream recalculates.</p>
      </header>
      <div className="canvas" onPointerDown={newNode}>
        {sheet.nodes.map((n) => (
          <Card
            key={n.id}
            node={n}
            lookup={lookup}
            focused={focus === n.id}
            linked={linked.has(n.id)}
            inputRef={(el) => { inputs.current[n.id] = el; }}
            onFocus={() => setFocus(n.id)}
            onChange={(text) => setSheet(update(sheet, n.id, { text }))}
            onLabel={(label) => setSheet(update(sheet, n.id, { label }))}
            onMove={(x, y) => setSheet(update(sheet, n.id, { x, y }))}
            onLink={() => link(n.id)}
            onGraph={() => setSheet(update(sheet, n.id, { graph: !n.graph }))}
            onDelete={() => { setSheet(removeNode(sheet, n.id)); if (focus === n.id) setFocus(null); }}
          />
        ))}
      </div>
    </div>
  );
}

function Card({ node, lookup, focused, linked, inputRef, onFocus, onChange, onLabel, onMove, onLink, onGraph, onDelete }) {
  const drag = useRef(null);

  function down(e) {
    if (e.target.closest('input, button, .result')) return;
    drag.current = { dx: e.clientX - node.x, dy: e.clientY - node.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }
  function move(e) {
    if (!drag.current) return;
    onMove(Math.max(0, e.clientX - drag.current.dx), Math.max(0, e.clientY - drag.current.dy));
  }
  const up = () => { drag.current = null; };

  const graphable = node.graph && node.ast;

  return (
    <article
      className={`card${focused ? ' focused' : ''}${linked ? ' linked' : ''}`}
      style={{ left: node.x, top: node.y }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <input
        className="label"
        value={node.label}
        placeholder="label"
        aria-label="label"
        onChange={(e) => onLabel(e.target.value)}
      />
      <div className="row">
        <input
          ref={inputRef}
          className="expr"
          value={node.text}
          placeholder="2 + 2"
          aria-label="expression"
          spellCheck={false}
          onFocus={onFocus}
          onChange={(e) => onChange(e.target.value)}
        />
        <button className="result" onClick={onLink} title="Use this result in the expression you're editing">
          {node.error ? '?' : format(node.value)}
        </button>
      </div>
      {node.error && <p className="err">{node.error}</p>}
      {graphable && <Graph ast={node.ast} lookup={lookup} />}
      <div className="tools">
        <button onClick={onGraph} aria-pressed={!!node.graph}>{node.graph ? 'hide graph' : 'graph x'}</button>
        <button onClick={onDelete}>delete</button>
      </div>
    </article>
  );
}
