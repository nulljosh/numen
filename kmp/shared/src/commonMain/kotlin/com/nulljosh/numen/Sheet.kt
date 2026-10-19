package com.nulljosh.numen

import kotlin.math.*

// Ported from numen/src/lib/parse.js. Keep in lockstep with that file and
// ios/App/Parser.swift — one grammar, three implementations.

sealed class Token {
    data class Num(val value: Double) : Token()
    data class Ref(val id: String) : Token()
    data class Name(val name: String) : Token()
    object Plus : Token(); object Minus : Token(); object Star : Token()
    object Slash : Token(); object Caret : Token()
    object LParen : Token(); object RParen : Token()
}

class ParseException(message: String) : Exception(message)

private val NUM_RE = Regex("^(?:\\d+(?:\\.\\d+)?|\\.\\d+)")
private val ID_RE = Regex("^[A-Za-z0-9_]+")
private val NAME_RE = Regex("^[A-Za-z_][A-Za-z0-9_]*")

fun tokenize(src: String): List<Token> {
    val out = mutableListOf<Token>()
    var i = 0
    while (i < src.length) {
        val c = src[i]
        if (c == ' ' || c == '\t') { i++; continue }
        if (c == '@') {
            val m = ID_RE.find(src.substring(i + 1)) ?: throw ParseException("expected an id after @")
            out.add(Token.Ref(m.value)); i += 1 + m.value.length; continue
        }
        if (c == '.' || c.isDigit()) {
            val m = NUM_RE.find(src.substring(i))
            if (m != null) { out.add(Token.Num(m.value.toDouble())); i += m.value.length; continue }
        }
        if (c.isLetter()) {
            val m = NAME_RE.find(src.substring(i))!!
            out.add(Token.Name(m.value)); i += m.value.length; continue
        }
        when (c) {
            '+' -> out.add(Token.Plus); '-' -> out.add(Token.Minus)
            '*' -> out.add(Token.Star); '/' -> out.add(Token.Slash)
            '^' -> out.add(Token.Caret); '(' -> out.add(Token.LParen); ')' -> out.add(Token.RParen)
            else -> throw ParseException("unexpected \"$c\"")
        }
        i++
    }
    return out
}

val FUNCTIONS: Map<String, (Double) -> Double> = mapOf(
    "sqrt" to ::sqrt, "cbrt" to ::cbrt, "abs" to ::abs,
    "sin" to ::sin, "cos" to ::cos, "tan" to ::tan,
    "asin" to ::asin, "acos" to ::acos, "atan" to ::atan,
    "sinh" to ::sinh, "cosh" to ::cosh, "tanh" to ::tanh,
    "exp" to ::exp, "floor" to ::floor, "ceil" to ::ceil,
    "round" to { x: Double -> round(x) }, "sign" to { x: Double -> sign(x) },
    "log" to ::ln, "ln" to ::ln, "log10" to ::log10, "log2" to { x: Double -> log2(x) },
)

val CONSTANTS: Map<String, Double> = mapOf("pi" to PI, "e" to E, "tau" to 2 * PI)

sealed class Ast {
    data class NumLit(val value: Double) : Ast()
    data class RefLit(val id: String) : Ast()
    data class VarLit(val name: String) : Ast()
    data class Neg(val arg: Ast) : Ast()
    data class Call(val name: String, val arg: Ast) : Ast()
    data class Op(val op: Char, val left: Ast, val right: Ast) : Ast()
}

// Local funs need forward references between unary/power/term/expr, which
// Kotlin doesn't support directly — wired via lateinit lambdas instead.
fun parse(src: String): Ast {
    val ts = tokenize(src)
    var p = 0
    fun peek(): Token? = ts.getOrNull(p)

    lateinit var expr: () -> Ast
    lateinit var term: () -> Ast
    lateinit var unary: () -> Ast
    lateinit var power: () -> Ast

    fun primary(): Ast {
        val t = ts.getOrNull(p) ?: throw ParseException("unexpected end of expression")
        return when (t) {
            is Token.LParen -> {
                p++
                val e = expr()
                if (ts.getOrNull(p) !is Token.RParen) throw ParseException("missing )")
                p++
                e
            }
            is Token.Num -> { p++; Ast.NumLit(t.value) }
            is Token.Ref -> { p++; Ast.RefLit(t.id) }
            is Token.Name -> {
                p++
                if (t.name in FUNCTIONS && peek() is Token.LParen) {
                    p++
                    val arg = expr()
                    if (ts.getOrNull(p) !is Token.RParen) throw ParseException("missing ) after ${t.name}(")
                    p++
                    Ast.Call(t.name, arg)
                } else if (t.name in FUNCTIONS) {
                    throw ParseException("${t.name} needs an argument, e.g. ${t.name}(2)")
                } else if (t.name in CONSTANTS) {
                    Ast.NumLit(CONSTANTS.getValue(t.name))
                } else {
                    Ast.VarLit(t.name)
                }
            }
            else -> throw ParseException("unexpected token")
        }
    }
    unary = {
        if (peek() is Token.Minus) { p++; Ast.Neg(unary()) } else power()
    }
    power = {
        val base = primary()
        if (peek() is Token.Caret) { p++; Ast.Op('^', base, unary()) } else base
    }
    fun startsImplicitFactor(t: Token?) = t is Token.Name || t is Token.Ref || t is Token.LParen
    term = {
        var left = unary()
        var done = false
        while (!done) {
            val t = peek()
            when {
                t is Token.Star -> { p++; left = Ast.Op('*', left, unary()) }
                t is Token.Slash -> { p++; left = Ast.Op('/', left, unary()) }
                startsImplicitFactor(t) -> left = Ast.Op('*', left, unary())
                else -> done = true
            }
        }
        left
    }
    expr = {
        var left = term()
        var done = false
        while (!done) {
            val t = peek()
            when {
                t is Token.Plus -> { p++; left = Ast.Op('+', left, term()) }
                t is Token.Minus -> { p++; left = Ast.Op('-', left, term()) }
                else -> done = true
            }
        }
        left
    }

    val ast = expr()
    if (p < ts.size) throw ParseException("trailing token")
    return ast
}

fun refs(ast: Ast, out: MutableSet<String> = mutableSetOf()): Set<String> {
    when (ast) {
        is Ast.RefLit -> out.add(ast.id)
        is Ast.Neg -> refs(ast.arg, out)
        is Ast.Call -> refs(ast.arg, out)
        is Ast.Op -> { refs(ast.left, out); refs(ast.right, out) }
        else -> {}
    }
    return out
}

fun evalAst(ast: Ast, lookup: (String) -> Double, vars: Map<String, Double> = emptyMap()): Double =
    when (ast) {
        is Ast.NumLit -> ast.value
        is Ast.RefLit -> lookup(ast.id)
        is Ast.VarLit -> vars[ast.name] ?: Double.NaN
        is Ast.Neg -> -evalAst(ast.arg, lookup, vars)
        is Ast.Call -> FUNCTIONS.getValue(ast.name)(evalAst(ast.arg, lookup, vars))
        is Ast.Op -> {
            val a = evalAst(ast.left, lookup, vars)
            val b = evalAst(ast.right, lookup, vars)
            when (ast.op) {
                '+' -> a + b; '-' -> a - b; '*' -> a * b; '/' -> a / b
                else -> a.pow(b)
            }
        }
    }

data class Card(val id: String, val expression: String, val result: Double? = null)
