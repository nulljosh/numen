package com.nulljosh.numen

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class SheetTest {
    private fun evalExpr(src: String) = evalAst(parse(src), { Double.NaN })

    @Test fun arithmetic() {
        assertEquals(7.0, evalExpr("1+2*3"))
        assertEquals(9.0, evalExpr("(1+2)*3"))
        assertEquals(-8.0, evalExpr("-2^3"))
        assertEquals(0.125, evalExpr("2^-3"))
    }

    @Test fun implicitMultiplicationWithVar() {
        assertEquals(8.0, evalAst(parse("4x"), { Double.NaN }, mapOf("x" to 2.0)))
    }

    @Test fun functionsAndConstants() {
        assertEquals(1.0, evalExpr("sin(pi/2)"), absoluteTolerance = 1e-9)
        assertEquals(0.0, evalExpr("log(1)"))
    }

    @Test fun refs() {
        val ast = parse("@a + 1")
        assertEquals(setOf("a"), refs(ast))
        assertEquals(3.0, evalAst(ast, { 2.0 }))
    }

    @Test fun errors() {
        assertFailsWith<ParseException> { parse("1 +") }
        assertFailsWith<ParseException> { parse("sqrt") }
        assertFailsWith<ParseException> { parse("(1+2") }
    }
}

private fun assertEquals(expected: Double, actual: Double, absoluteTolerance: Double) {
    kotlin.test.assertTrue(kotlin.math.abs(expected - actual) <= absoluteTolerance, "expected $expected, got $actual")
}
