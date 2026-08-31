// The document model: a bag of nodes, each an expression placed somewhere on the canvas.
// Pure — no SwiftUI. evaluate() is a single memoized pass over the whole sheet.
//
// Port of src/lib/sheet.js.

import Foundation

struct Node: Identifiable {
    var id: String
    var x: Double = 40
    var y: Double = 40
    var text: String = ""
    var label: String = ""
    var graph: Bool = false

    // Derived — never persisted, always recomputed from `text`.
    var ast: Expr?
    var error: String?
    var value: Double?
}

struct Sheet {
    var nextId: Int = 1
    var nodes: [Node] = []
}

/// A parse failure is captured on the node, never thrown outward: one bad card
/// must not stop the rest of the sheet evaluating.
func compiled(_ node: Node) -> Node {
    var n = node
    n.value = nil
    if n.text.trimmingCharacters(in: .whitespaces).isEmpty {
        n.ast = nil
        n.error = nil
        return n
    }
    do {
        n.ast = try parse(n.text)
        n.error = nil
    } catch {
        n.ast = nil
        n.error = "\(error)"
    }
    return n
}

func addNode(
    _ sheet: Sheet,
    x: Double = 40, y: Double = 40,
    text: String = "", label: String = "", graph: Bool = false
) -> (Sheet, String) {
    let id = String(sheet.nextId)
    let node = compiled(Node(id: id, x: x, y: y, text: text, label: label, graph: graph))
    var s = sheet
    s.nextId += 1
    s.nodes.append(node)
    return (evaluate(s), id)
}

/// Recompiles only when the expression text changed; a move or a relabel skips the parser.
func update(
    _ sheet: Sheet, _ id: String,
    text: String? = nil, label: String? = nil,
    x: Double? = nil, y: Double? = nil, graph: Bool? = nil
) -> Sheet {
    var s = sheet
    guard let i = s.nodes.firstIndex(where: { $0.id == id }) else { return s }
    var n = s.nodes[i]
    if let label { n.label = label }
    if let x { n.x = x }
    if let y { n.y = y }
    if let graph { n.graph = graph }
    if let text {
        n.text = text
        n = compiled(n)
    }
    s.nodes[i] = n
    return evaluate(s)
}

func removeNode(_ sheet: Sheet, _ id: String) -> Sheet {
    var s = sheet
    s.nodes.removeAll { $0.id == id }
    return evaluate(s)
}

/// Recompute every value. Depth-first with an in-progress marker, so a reference cycle
/// yields NaN instead of recursing forever.
func evaluate(_ sheet: Sheet) -> Sheet {
    var byId: [String: Node] = [:]
    for n in sheet.nodes { byId[n.id] = n }
    var done: [String: Double] = [:]
    var inProgress: Set<String> = []

    func valueOf(_ id: String) -> Double {
        if let v = done[id] { return v }
        if inProgress.contains(id) { return .nan }  // cycle
        guard let n = byId[id], let ast = n.ast else { return .nan }
        inProgress.insert(id)
        let v = evalAst(ast, lookup: valueOf)
        inProgress.remove(id)
        done[id] = v
        return v
    }

    var s = sheet
    s.nodes = sheet.nodes.map { n in
        var n = n
        n.value = n.ast == nil ? nil : valueOf(n.id)
        return n
    }
    return s
}

/// ids that would break if `id` changed — used to draw the link highlights
func dependents(_ sheet: Sheet, _ id: String) -> [String] {
    sheet.nodes.filter { n in
        guard let ast = n.ast else { return false }
        return refs(ast).contains(id)
    }.map(\.id)
}

func format(_ v: Double?) -> String {
    guard let v else { return "" }
    if v.isNaN { return "—" }
    if v.isInfinite { return v > 0 ? "∞" : "-∞" }
    let r = (v * 1e10).rounded() / 1e10  // kill float noise: 0.1 + 0.2 reads as 0.3
    if abs(r) >= 1e12 || (r != 0 && abs(r) < 1e-6) {
        return String(format: "%.4e", r)
    }
    // Match JS number-to-string: a whole number prints as `4`, not `4.0`.
    if r == r.rounded() && abs(r) < 1e15 { return String(Int64(r)) }
    return String(r)
}
