import SwiftUI

private enum Op: String { case add = "+", sub = "-", mul = "×", div = "÷" }

struct ContentView: View {
    @State private var display = "0"
    @State private var accumulator: Double?
    @State private var pendingOp: Op?
    @State private var startingNewEntry = true

    private let pad: [[String]] = [
        ["7", "8", "9", "÷"],
        ["4", "5", "6", "×"],
        ["1", "2", "3", "-"],
        ["C", "0", "=", "+"],
    ]

    var body: some View {
        VStack(spacing: 4) {
            Text(display)
                .font(.system(size: 24, weight: .medium, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.horizontal, 6)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 4), spacing: 4) {
                ForEach(pad.flatMap { $0 }, id: \.self) { key in
                    Button(key) { tap(key) }
                        .buttonStyle(.bordered)
                        .tint(tint(for: key))
                        .font(.system(size: 14))
                }
            }
        }
        .padding(4)
    }

    private func tint(for key: String) -> Color {
        if key == "C" { return .red }
        if ["+", "-", "×", "÷", "="].contains(key) { return .cyan }
        return .gray
    }

    private func tap(_ key: String) {
        switch key {
        case "C":
            display = "0"; accumulator = nil; pendingOp = nil; startingNewEntry = true
        case "+", "-", "×", "÷":
            commit()
            accumulator = Double(display)
            pendingOp = Op(rawValue: key)
            startingNewEntry = true
        case "=":
            commit()
            pendingOp = nil
        default:
            if startingNewEntry {
                display = key
                startingNewEntry = false
            } else {
                display = display == "0" ? key : display + key
            }
        }
    }

    private func commit() {
        guard let op = pendingOp, let lhs = accumulator, let rhs = Double(display) else { return }
        let result: Double
        switch op {
        case .add: result = lhs + rhs
        case .sub: result = lhs - rhs
        case .mul: result = lhs * rhs
        case .div: result = rhs == 0 ? .nan : lhs / rhs
        }
        display = result.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(result))
            : String(format: "%g", result)
        accumulator = result
    }
}
