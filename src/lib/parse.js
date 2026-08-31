// Recursive-descent parser for + - * / ^ ( ), numbers, `x` (graph variable),
// single-argument functions, the constants pi/e/tau, and `@id` references to
// another node's result.
//
// Kept in lockstep with ios/App/Parser.swift — the two are one grammar with two
// implementations, and ios/Checks/main.swift mirrors src/lib/sheet.test.js so they
// cannot drift apart silently.

const NUM = /^(?:\d+(?:\.\d+)?|\.\d+)/;

export function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '@') {
      const m = src.slice(i + 1).match(/^[A-Za-z0-9_]+/);
      if (!m) throw new SyntaxError('expected an id after @');
      out.push({ type: 'ref', id: m[0], start: i, end: i + 1 + m[0].length });
      i += 1 + m[0].length;
      continue;
    }
    const n = (c === '.' || /\d/.test(c)) ? src.slice(i).match(NUM) : null;
    if (n) {
      out.push({ type: 'num', value: parseFloat(n[0]), start: i, end: i + n[0].length });
      i += n[0].length;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      const m = src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      out.push({ type: 'name', name: m[0], start: i, end: i + m[0].length });
      i += m[0].length;
      continue;
    }
    if ('+-*/^()'.includes(c)) { out.push({ type: c, start: i, end: i + 1 }); i++; continue; }
    throw new SyntaxError(`unexpected "${c}"`);
  }
  return out;
}

// expr  := term (('+'|'-') term)*
// term  := unary (('*'|'/') unary | implicit-multiplication)*
// unary := '-' unary | power
// power := primary ('^' unary)?     -- right-assoc; the exponent recurses through unary,
//                                      so `2^-3` parses and `-3^2` is -(3^2), not (-3)^2.
// `log` is the NATURAL logarithm, matching mathjs and curvely's Expression.swift.
// Changing that here without changing it in Parser.swift makes every log() plot
// disagree between the web app and the native one.
export const FUNCTIONS = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  exp: Math.exp, floor: Math.floor, ceil: Math.ceil,
  round: Math.round, sign: Math.sign,
  log: Math.log, ln: Math.log, log10: Math.log10, log2: Math.log2,
};

export const CONSTANTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

export function parse(src) {
  const ts = tokenize(src);
  let p = 0;
  const peek = () => ts[p];
  const eat = (t) => (ts[p] && ts[p].type === t ? ts[p++] : null);

  function primary() {
    const t = ts[p];
    if (!t) throw new SyntaxError('unexpected end of expression');
    if (t.type === '(') {
      p++;
      const e = expr();
      if (!eat(')')) throw new SyntaxError('missing )');
      return e;
    }
    if (t.type === 'num') { p++; return { kind: 'num', value: t.value, start: t.start, end: t.end }; }
    if (t.type === 'ref') { p++; return { kind: 'ref', id: t.id, start: t.start, end: t.end }; }
    if (t.type === 'name') {
      p++;
      // A name followed by `(` is a call — but only for a name we actually know, so
      // `x(2+3)` stays an implicit multiplication rather than an unknown-function error.
      if (t.name in FUNCTIONS && peek() && peek().type === '(') {
        p++;
        const arg = expr();
        if (!eat(')')) throw new SyntaxError(`missing ) after ${t.name}(`);
        return { kind: 'call', name: t.name, arg, start: t.start, end: t.end };
      }
      if (t.name in FUNCTIONS) throw new SyntaxError(`${t.name} needs an argument, e.g. ${t.name}(2)`);
      if (t.name in CONSTANTS) return { kind: 'num', value: CONSTANTS[t.name], start: t.start, end: t.end };
      return { kind: 'var', name: t.name, start: t.start, end: t.end };
    }
    throw new SyntaxError(`unexpected "${t.type}"`);
  }
  function unary() {
    if (eat('-')) return { kind: 'neg', arg: unary() };
    return power();
  }
  function power() {
    const base = primary();
    if (eat('^')) return { kind: 'op', op: '^', left: base, right: unary() }; // right-assoc
    return base;
  }
  /** `4x`, `2(3+4)`, `2pi` — but NOT `2 3`, so a typo stays an error instead of a silent product. */
  function startsImplicitFactor(t) {
    return !!t && (t.type === 'name' || t.type === 'ref' || t.type === '(');
  }
  function term() {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t && (t.type === '*' || t.type === '/')) { p++; left = { kind: 'op', op: t.type, left, right: unary() }; }
      else if (startsImplicitFactor(t)) { left = { kind: 'op', op: '*', left, right: unary() }; }
      else return left;
    }
  }
  function expr() {
    let left = term();
    for (;;) {
      const t = peek();
      if (t && (t.type === '+' || t.type === '-')) { p++; left = { kind: 'op', op: t.type, left, right: term() }; }
      else return left;
    }
  }
  const ast = expr();
  if (p < ts.length) throw new SyntaxError(`trailing "${ts[p].type}"`);
  return ast;
}

/** ids this expression depends on */
export function refs(ast, out = new Set()) {
  if (!ast) return out;
  if (ast.kind === 'ref') out.add(ast.id);
  if (ast.kind === 'neg') refs(ast.arg, out);
  if (ast.kind === 'call') refs(ast.arg, out);
  if (ast.kind === 'op') { refs(ast.left, out); refs(ast.right, out); }
  return out;
}

/** every number leaf, in source order — these are the draggable/scrubbable digits */
export function numbers(ast, out = []) {
  if (!ast) return out;
  if (ast.kind === 'num') out.push(ast);
  if (ast.kind === 'neg') numbers(ast.arg, out);
  if (ast.kind === 'call') numbers(ast.arg, out);
  if (ast.kind === 'op') { numbers(ast.left, out); numbers(ast.right, out); }
  return out;
}

/** `lookup(id)` resolves references; `vars` supplies named values (e.g. x for graphs) */
export function evalAst(ast, lookup, vars = {}) {
  switch (ast.kind) {
    case 'num': return ast.value;
    case 'ref': return lookup(ast.id);
    case 'var': return ast.name in vars ? vars[ast.name] : NaN;
    case 'neg': return -evalAst(ast.arg, lookup, vars);
    case 'call': return FUNCTIONS[ast.name](evalAst(ast.arg, lookup, vars));
    case 'op': {
      const a = evalAst(ast.left, lookup, vars);
      const b = evalAst(ast.right, lookup, vars);
      return ast.op === '+' ? a + b : ast.op === '-' ? a - b : ast.op === '*' ? a * b : ast.op === '/' ? a / b : a ** b;
    }
    default: return NaN;
  }
}
