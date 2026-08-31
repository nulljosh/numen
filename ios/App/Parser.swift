// Recursive-descent parser for + - * / ^ ( ), numbers, `x` (graph variable),
// and `@id` references to another node's result.
//
// A line-for-line port of src/lib/parse.js. Divergences from the JS are bugs,
// not improvements — ios/Checks/main.swift pins the grammar.

import Foundation

struct ParseError: Error, CustomStringConvertible {
    let description: String
    init(_ message: String) { description = message }
}

struct Token {
    enum Kind {
        case num(Double)
        case ref(String)
        case name(String)
        case sym(Character)

        /// Matches the `type` string the JS reports in its error messages.
        var label: String {
            switch self {
            case .num: return "num"
            case .ref: return "ref"
            case .name: return "name"
            case .sym(let c): return String(c)
            }
        }
    }
    let kind: Kind
    let start: Int
    let end: Int
}

func tokenize(_ src: String) throws -> [Token] {
    let s = Array(src)
    var out: [Token] = []
    var i = 0

    func isDigit(_ c: Character) -> Bool { c.isASCII && c.isNumber }
    func isAlpha(_ c: Character) -> Bool { c.isASCII && c.isLetter }
    func isWordChar(_ c: Character) -> Bool { isAlpha(c) || isDigit(c) || c == "_" }

    while i < s.count {
        let c = s[i]
        if c == " " || c == "\t" { i += 1; continue }

        if c == "@" {
            var j = i + 1
            while j < s.count && isWordChar(s[j]) { j += 1 }
            if j == i + 1 { throw ParseError("expected an id after @") }
            out.append(Token(kind: .ref(String(s[(i + 1)..<j])), start: i, end: j))
            i = j
            continue
        }

        // Numbers are matched before identifiers, exactly as the JS does, so
        // `2x` tokenizes as num(2), name(x) and only fails later as a trailing token.
        if isDigit(c) {
            var j = i
            while j < s.count && isDigit(s[j]) { j += 1 }
            if j + 1 < s.count && s[j] == "." && isDigit(s[j + 1]) {
                j += 1
                while j < s.count && isDigit(s[j]) { j += 1 }
            }
            out.append(Token(kind: .num(Double(String(s[i..<j])) ?? .nan), start: i, end: j))
            i = j
            continue
        }

        // Entry is a letter only — a leading `_` falls through and throws, as in the JS.
        if isAlpha(c) {
            var j = i
            while j < s.count && isWordChar(s[j]) { j += 1 }
            out.append(Token(kind: .name(String(s[i..<j])), start: i, end: j))
            i = j
            continue
        }

        if "+-*/^()".contains(c) {
            out.append(Token(kind: .sym(c), start: i, end: i + 1))
            i += 1
            continue
        }

        throw ParseError("unexpected \"\(c)\"")
    }
    return out
}

indirect enum Expr {
    case num(Double)
    case ref(String)
    case variable(String)
    case neg(Expr)
    case op(Character, Expr, Expr)
}

// expr := term (('+'|'-') term)*   term := power (('*'|'/') power)*
// power := unary ('^' power)?      unary := '-' unary | primary
//
// Unary minus binds tighter than `^` here, so `-3^2` is (-3)^2 = 9, not -(3^2). That is the
// opposite of standard math notation; it is the web app's behaviour and the port keeps it.
func parse(_ src: String) throws -> Expr {
    let ts = try tokenize(src)
    var p = 0

    func peek() -> Token? { p < ts.count ? ts[p] : nil }

    func eat(_ c: Character) -> Bool {
        if let t = peek(), case .sym(let s) = t.kind, s == c { p += 1; return true }
        return false
    }

    func primary() throws -> Expr {
        guard let t = peek() else { throw ParseError("unexpected end of expression") }
        switch t.kind {
        case .num(let v): p += 1; return .num(v)
        case .ref(let id): p += 1; return .ref(id)
        case .name(let n): p += 1; return .variable(n)
        case .sym(let c):
            if c == "(" {
                p += 1
                let e = try expr()
                if !eat(")") { throw ParseError("missing )") }
                return e
            }
            throw ParseError("unexpected \"\(c)\"")
        }
    }

    func unary() throws -> Expr {
        if eat("-") { return .neg(try unary()) }
        return try primary()
    }

    func power() throws -> Expr {
        let base = try unary()
        if eat("^") { return .op("^", base, try power()) }  // right-assoc
        return base
    }

    func term() throws -> Expr {
        var left = try power()
        while let t = peek(), case .sym(let c) = t.kind, c == "*" || c == "/" {
            p += 1
            left = .op(c, left, try power())
        }
        return left
    }

    func expr() throws -> Expr {
        var left = try term()
        while let t = peek(), case .sym(let c) = t.kind, c == "+" || c == "-" {
            p += 1
            left = .op(c, left, try term())
        }
        return left
    }

    let ast = try expr()
    if p < ts.count { throw ParseError("trailing \"\(ts[p].kind.label)\"") }
    return ast
}

/// ids this expression depends on
func refs(_ e: Expr) -> Set<String> {
    var out: Set<String> = []
    func walk(_ e: Expr) {
        switch e {
        case .ref(let id): out.insert(id)
        case .neg(let a): walk(a)
        case .op(_, let l, let r): walk(l); walk(r)
        case .num, .variable: break
        }
    }
    walk(e)
    return out
}

/// `lookup` resolves references; `vars` supplies named values (e.g. x for graphs)
func evalAst(_ e: Expr, lookup: (String) -> Double, vars: [String: Double] = [:]) -> Double {
    switch e {
    case .num(let v):
        return v
    case .ref(let id):
        return lookup(id)
    case .variable(let n):
        return vars[n] ?? .nan
    case .neg(let a):
        return -evalAst(a, lookup: lookup, vars: vars)
    case .op(let o, let l, let r):
        let a = evalAst(l, lookup: lookup, vars: vars)
        let b = evalAst(r, lookup: lookup, vars: vars)
        switch o {
        case "+": return a + b
        case "-": return a - b
        case "*": return a * b
        case "/": return a / b
        default: return pow(a, b)
        }
    }
}
