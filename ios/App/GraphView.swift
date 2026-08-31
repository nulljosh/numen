// Plots the node's expression over x, live: it re-samples whenever any input changes.
//
// Port of src/components/Graph.jsx — an inline sparkline inside a card, not a full plot.
// Deliberately no axes, gridlines, zoom or pan: curvely/ios/App/GraphView.swift is the
// place to lift from if Numen ever wants those.

import SwiftUI

struct GraphView: View {
    let ast: Expr
    let lookup: (String) -> Double
    var from: Double = -10
    var to: Double = 10

    private static let w: CGFloat = 240
    private static let h: CGFloat = 140
    private static let pad: CGFloat = 6
    private static let samples = 120

    private var plot: (points: [CGPoint], lo: Double, hi: Double) {
        var pts: [(Double, Double)] = []
        var lo = Double.infinity
        var hi = -Double.infinity
        for i in 0..<Self.samples {
            let x = from + (to - from) * Double(i) / Double(Self.samples - 1)
            let y = evalAst(ast, lookup: lookup, vars: ["x": x])
            if y.isFinite {
                pts.append((x, y))
                lo = Swift.min(lo, y)
                hi = Swift.max(hi, y)
            }
        }
        guard !pts.isEmpty else { return ([], 0, 0) }
        if hi - lo < 1e-9 { hi += 1; lo -= 1 }

        let w = Self.w, h = Self.h, pad = Self.pad
        let mapped = pts.map { (x, y) -> CGPoint in
            CGPoint(
                x: pad + CGFloat((x - from) / (to - from)) * (w - 2 * pad),
                y: h - pad - CGFloat((y - lo) / (hi - lo)) * (h - 2 * pad)
            )
        }
        return (mapped, lo, hi)
    }

    var body: some View {
        let p = plot
        Canvas { ctx, _ in
            guard p.points.count > 1 else { return }
            var path = Path()
            path.addLines(p.points)
            ctx.stroke(path, with: .color(Theme.accent), lineWidth: 1.5)

            if p.hi.isFinite {
                ctx.draw(
                    Text(p.hi.formatted(.number.precision(.significantDigits(3))))
                        .font(.system(size: 9)).foregroundColor(Theme.muted),
                    at: CGPoint(x: Self.pad, y: 8), anchor: .leading
                )
            }
            if p.lo.isFinite {
                ctx.draw(
                    Text(p.lo.formatted(.number.precision(.significantDigits(3))))
                        .font(.system(size: 9)).foregroundColor(Theme.muted),
                    at: CGPoint(x: Self.pad, y: Self.h - 8), anchor: .leading
                )
            }
        }
        .frame(width: Self.w, height: Self.h)
        .accessibilityLabel("graph of the expression")
    }
}
