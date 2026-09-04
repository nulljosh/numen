package com.nulljosh.numen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable
fun NumenTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = lightColorScheme(), content = content)

// ponytail: single-expression evaluator, not the draggable multi-card
// infinite canvas the web app has. Sheet.kt's parser is fully ported and
// tested; wiring up multiple linked cards (@refs, drag position, SVG
// graphing) is the remaining work.
@Composable
fun SheetScreen() {
    var input by remember { mutableStateOf("") }
    val result = remember(input) {
        if (input.isBlank()) null
        else runCatching { evalAst(parse(input), { Double.NaN }) }.getOrNull()
    }

    Surface {
        Column(Modifier.padding(24.dp).fillMaxWidth()) {
            Text("Numen", style = MaterialTheme.typography.headlineMedium)
            Box(Modifier.padding(top = 16.dp)) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    label = { Text("Expression") },
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Text(
                text = result?.toString() ?: (if (input.isBlank()) "" else "?"),
                style = MaterialTheme.typography.headlineSmall,
                modifier = Modifier.padding(top = 16.dp),
            )
        }
    }
}
