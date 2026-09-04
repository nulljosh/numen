package com.nulljosh.numen

import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "Numen",
        state = rememberWindowState(width = 1040.dp, height = 720.dp),
    ) {
        NumenTheme {
            SheetScreen()
        }
    }
}
