import Foundation
import SwiftTUI

// ponytail: static render, not a REPL — same shape as nimble-tui/cadence-tui.
// `numen-tui "2 + 2*sqrt(9)"` reuses the exact Parser.swift the app and web canvas run.

let args = CommandLine.arguments.dropFirst()
guard let src = args.first else {
    print("usage: numen-tui <expression>")
    exit(1)
}

let result: String
do {
    let expr = try parse(src)
    let value = evalAst(expr, lookup: { _ in .nan })
    result = value.isNaN ? "undefined" : String(value)
} catch {
    result = "\(error)"
}

struct ResultCard: View {
    let expression: String
    let result: String

    var body: some View {
        VStack(alignment: .leading) {
            Text(expression).bold()
            Text("= \(result)")
        }
        .padding()
        .border()
    }
}

Application(rootView: ResultCard(expression: src, result: result)).start()
