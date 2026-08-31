// Engine self-check. Ported from src/lib/sheet.test.js, plus two cases the JS suite
// lacks that pin grammar choices a port can silently get wrong.
//
// Run with no build system, no framework:
//   swiftc -o /tmp/numencheck ios/App/Parser.swift ios/App/Sheet.swift ios/Checks/main.swift && /tmp/numencheck
//
// ponytail: plain asserts in a main.swift instead of an XCTest target — the logic under
// test is pure Foundation, so a test target would only add a build graph to maintain.

import Foundation

var checks = 0
func check(_ condition: @autoclosure () -> Bool, _ label: String) {
    checks += 1
    guard condition() else {
        FileHandle.standardError.write("FAIL: \(label)\n".data(using: .utf8)!)
        exit(1)
    }
}

func val(_ s: String) -> Double {
    guard let ast = try? parse(s) else { return .nan }
    return evalAst(ast, lookup: { _ in .nan })
}

func throwsParse(_ s: String) -> Bool {
    do { _ = try parse(s); return false } catch { return true }
}

// MARK: parse — precedence and associativity

check(val("2+3*4") == 14, "precedence: * before +")
check(val("(2+3)*4") == 20, "parens override precedence")
check(val("2^3^2") == 512, "^ is right-assoc")
check(val("10-2-3") == 5, "- is left-assoc")
check(val("-3+1") == -2, "unary minus")

// Not in the JS suite: these pin where unary minus sits relative to ^. Numen binds unary
// TIGHTER than ^, so -3^2 is (-3)^2 = 9 — the opposite of standard math notation, where it
// is -(3^2) = -9. Pinned here so the native app cannot drift from the web app by accident;
// if the convention is ever changed it must change in both.
check(val("-3^2") == 9, "unary binds tighter than ^: -3^2 is (-3)^2")
check(val("2^-3") == 0.125, "a signed exponent parses via power -> unary")

// MARK: parse — junk

check(throwsParse("2+"), "rejects a dangling operator")
check(throwsParse("(2+3"), "rejects a missing paren")
check(throwsParse("2 3"), "rejects two numbers in a row")

// MARK: linked numbers — an edit cascades two hops

do {
    var s = Sheet()
    var a = "", b = "", c = ""
    (s, a) = addNode(s, text: "2+2")
    (s, b) = addNode(s, text: "@\(a) * 10")
    (s, c) = addNode(s, text: "@\(b) + 1")
    func v(_ id: String) -> Double? { s.nodes.first { $0.id == id }?.value }

    check(v(a) == 4 && v(b) == 40 && v(c) == 41, "initial cascade")
    s = update(s, a, text: "3+3")
    check(v(a) == 6 && v(b) == 60 && v(c) == 61, "edit cascades through two hops")
}

// MARK: dependents, and surviving a deleted reference

do {
    var s = Sheet()
    var a = "", b = ""
    (s, a) = addNode(s, text: "5")
    (s, b) = addNode(s, text: "@\(a) * 2")

    check(dependents(s, a) == [b], "reports dependents")
    s = removeNode(s, a)
    check(s.nodes.first { $0.id == b }?.value?.isNaN == true, "dangling ref is NaN, not a crash")
}

// MARK: a reference cycle resolves to NaN instead of hanging

do {
    var s = Sheet()
    var a = "", b = ""
    (s, a) = addNode(s, text: "1")
    (s, b) = addNode(s, text: "@\(a) + 1")
    s = update(s, a, text: "@\(b) + 1")

    check(s.nodes.allSatisfy { $0.value?.isNaN == true }, "cycle yields NaN everywhere and terminates")
}

// MARK: a syntax error stays local to its own node

do {
    var s = Sheet()
    var a = "", b = ""
    (s, a) = addNode(s, text: "2+")
    (s, b) = addNode(s, text: "9")

    check(s.nodes.first { $0.id == a }?.error != nil, "the bad node carries the error")
    check(s.nodes.first { $0.id == b }?.value == 9, "its neighbour still evaluates")
}

// MARK: format

check(format(0.1 + 0.2) == "0.3", "trims float noise")
check(format(1.0 / 0.0) == "∞", "names positive infinity")
check(format(-1.0 / 0.0) == "-∞", "names negative infinity")
check(format(Double.nan) == "—", "names NaN")
check(format(nil) == "", "an unevaluated node shows nothing")
check(format(14400) == "14400", "a whole number has no decimal tail")

print("ok — \(checks) checks passed")
