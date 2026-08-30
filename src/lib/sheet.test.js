import { describe, it, expect } from 'vitest';
import { parse, evalAst } from './parse.js';
import { emptySheet, addNode, update, removeNode, dependents, evaluate, format } from './sheet.js';

const val = (s) => evalAst(parse(s), () => NaN);

describe('parse', () => {
  it('honours precedence and associativity', () => {
    expect(val('2+3*4')).toBe(14);
    expect(val('(2+3)*4')).toBe(20);
    expect(val('2^3^2')).toBe(512); // right-assoc
    expect(val('10-2-3')).toBe(5); // left-assoc
    expect(val('-3+1')).toBe(-2);
  });
  it('rejects junk', () => {
    expect(() => parse('2+')).toThrow();
    expect(() => parse('(2+3')).toThrow();
    expect(() => parse('2 3')).toThrow();
  });
});

describe('linked numbers', () => {
  it('cascades an edit through two hops', () => {
    let s = emptySheet();
    let a, b, c;
    [s, a] = addNode(s, { text: '2+2' });
    [s, b] = addNode(s, { text: `@${a} * 10` });
    [s, c] = addNode(s, { text: `@${b} + 1` });
    const v = (id) => s.nodes.find((n) => n.id === id).value;
    expect([v(a), v(b), v(c)]).toEqual([4, 40, 41]);

    s = update(s, a, { text: '3+3' });
    expect([v(a), v(b), v(c)]).toEqual([6, 60, 61]);
  });

  it('reports dependents and survives a deleted reference', () => {
    let s = emptySheet();
    let a, b;
    [s, a] = addNode(s, { text: '5' });
    [s, b] = addNode(s, { text: `@${a} * 2` });
    expect(dependents(s, a)).toEqual([b]);
    s = removeNode(s, a);
    expect(s.nodes.find((n) => n.id === b).value).toBeNaN();
  });

  it('resolves a reference cycle to NaN instead of hanging', () => {
    let s = emptySheet();
    let a, b;
    [s, a] = addNode(s, { text: '1' });
    [s, b] = addNode(s, { text: `@${a} + 1` });
    s = update(s, a, { text: `@${b} + 1` });
    expect(s.nodes.every((n) => Number.isNaN(n.value))).toBe(true);
  });

  it('keeps a syntax error local to its own node', () => {
    let s = emptySheet();
    let a, b;
    [s, a] = addNode(s, { text: '2+' });
    [s, b] = addNode(s, { text: '9' });
    expect(s.nodes.find((n) => n.id === a).error).toBeTruthy();
    expect(s.nodes.find((n) => n.id === b).value).toBe(9);
    expect(() => evaluate(s)).not.toThrow();
  });
});

describe('format', () => {
  it('trims float noise and names the infinities', () => {
    expect(format(0.1 + 0.2)).toBe('0.3');
    expect(format(1 / 0)).toBe('∞');
    expect(format(NaN)).toBe('—');
  });
});
