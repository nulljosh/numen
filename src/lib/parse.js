// Recursive-descent parser for + - * / ^ ( ), numbers, `x` (graph variable),
// and `@id` references to another node's result.

const NUM = /^\d+(\.\d+)?/;

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
    const n = src.slice(i).match(NUM);
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

// expr := term (('+'|'-') term)*   term := power (('*'|'/') power)*
// power := unary ('^' power)?      unary := '-' unary | primary
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
    if (t.type === 'name') { p++; return { kind: 'var', name: t.name, start: t.start, end: t.end }; }
    throw new SyntaxError(`unexpected "${t.type}"`);
  }
  function unary() {
    if (eat('-')) return { kind: 'neg', arg: unary() };
    return primary();
  }
  function power() {
    const base = unary();
    if (eat('^')) return { kind: 'op', op: '^', left: base, right: power() }; // right-assoc
    return base;
  }
  function term() {
    let left = power();
    for (;;) {
      const t = peek();
      if (t && (t.type === '*' || t.type === '/')) { p++; left = { kind: 'op', op: t.type, left, right: power() }; }
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
  if (ast.kind === 'op') { refs(ast.left, out); refs(ast.right, out); }
  return out;
}

/** every number leaf, in source order — these are the draggable/scrubbable digits */
export function numbers(ast, out = []) {
  if (!ast) return out;
  if (ast.kind === 'num') out.push(ast);
  if (ast.kind === 'neg') numbers(ast.arg, out);
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
    case 'op': {
      const a = evalAst(ast.left, lookup, vars);
      const b = evalAst(ast.right, lookup, vars);
      return ast.op === '+' ? a + b : ast.op === '-' ? a - b : ast.op === '*' ? a * b : ast.op === '/' ? a / b : a ** b;
    }
    default: return NaN;
  }
}
