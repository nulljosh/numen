package com.nulljosh.numen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun NumenTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(), content = content)

// ponytail: placeholder canvas. Replace with the draggable-card infinite
// canvas once Sheet.kt's parser is ported.
@Composable
fun SheetScreen() {
    Surface {
        Box(Modifier.padding(24.dp)) {
            Text("Numen", style = MaterialTheme.typography.headlineMedium)
        }
    }
}
