// The canvas and its cards. Port of src/App.jsx.
//
// Two deliberate divergences from the web app, both noted where they happen:
//   - dragging uses a grip handle rather than the whole card, so it cannot fight
//     the text fields for the gesture;
//   - linking appends `@id` at the end of the expression rather than at the caret,
//     because SwiftUI's TextField does not expose a selection range.

import SwiftUI

private func starterSheet() -> Sheet {
    var s = Sheet()
    var a = "", b = ""
    (s, a) = addNode(s, x: 60, y: 80, text: "1200 * 12", label: "yearly rent")
    (s, b) = addNode(s, x: 60, y: 260, text: "@\(a) * 0.3", label: "what I could save")
    _ = b
    return s
}

struct ContentView: View {
    @State private var sheet: Sheet = Store.load() ?? starterSheet()
    /// The card whose expression field last had focus — the target `link()` writes into.
    @State private var focused: String?
    @FocusState private var focusedField: String?

    private static let canvasSize: CGFloat = 3000

    private var linked: Set<String> {
        guard let f = focused, let node = sheet.nodes.first(where: { $0.id == f }) else { return [] }
        var set = Set(dependents(sheet, f))
        if let ast = node.ast { set.formUnion(refs(ast)) }
        return set
    }

    private func lookup(_ id: String) -> Double {
        sheet.nodes.first { $0.id == id }?.value ?? .nan
    }

    /// Tydlig's core move: tapping a result drops a live link to it into the card you are editing.
    private func link(_ id: String) {
        guard let f = focused, f != id,
              let node = sheet.nodes.first(where: { $0.id == f }) else { return }
        sheet = update(sheet, f, text: node.text + "@\(id)")
        focusedField = f
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 4) {
                // On the Mac the window title already says Numen — a second one in the
                // header just reads as a duplicate.
                #if !os(macOS)
                Text("Numen").font(.system(size: 17, weight: .semibold))
                #endif
                Text("Tap anywhere to write. Tap another card's result to link it in — everything downstream recalculates.")
                    .font(.system(size: 12)).foregroundStyle(Theme.muted)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 16).padding(.vertical, 12)
            .background(Theme.surface)
            .overlay(alignment: .bottom) { Rectangle().fill(Theme.line).frame(height: 1) }

            ScrollView([.horizontal, .vertical]) {
                ZStack(alignment: .topLeading) {
                    Color.clear
                        .frame(width: Self.canvasSize, height: Self.canvasSize)
                        .contentShape(Rectangle())
                        .onTapGesture { location in
                            let (next, id) = addNode(sheet, x: max(0, location.x - 20), y: max(0, location.y - 20))
                            sheet = next
                            focused = id
                            focusedField = id
                        }

                    ForEach(sheet.nodes) { node in
                        CardView(
                            node: node,
                            lookup: lookup,
                            isFocused: focused == node.id,
                            isLinked: linked.contains(node.id),
                            field: $focusedField,
                            onText: { sheet = update(sheet, node.id, text: $0) },
                            onLabel: { sheet = update(sheet, node.id, label: $0) },
                            onMove: { sheet = update(sheet, node.id, x: $0, y: $1) },
                            onLink: { link(node.id) },
                            onGraph: { sheet = update(sheet, node.id, graph: !node.graph) },
                            onDelete: {
                                sheet = removeNode(sheet, node.id)
                                if focused == node.id { focused = nil }
                            }
                        )
                        .offset(x: node.x, y: node.y)
                    }
                }
            }
            .background(Theme.bg)
        }
        .background(Theme.bg)
        .onChange(of: focusedField) { _, new in if let new { focused = new } }
        .onChange(of: sheet.nodes.count) { _, _ in Store.save(sheet) }
        .onDisappear { Store.save(sheet) }
        // Debounced rather than saved on every keystroke, which is what the web app does.
        .task(id: sheetSignature) {
            try? await Task.sleep(for: .milliseconds(400))
            Store.save(sheet)
        }
    }

    /// Cheap change token: persistence only cares about the fields Store writes.
    private var sheetSignature: String {
        sheet.nodes.map { "\($0.id):\($0.x):\($0.y):\($0.text):\($0.label):\($0.graph)" }
            .joined(separator: "|")
    }
}

private struct CardView: View {
    let node: Node
    let lookup: (String) -> Double
    let isFocused: Bool
    let isLinked: Bool
    var field: FocusState<String?>.Binding
    let onText: (String) -> Void
    let onLabel: (String) -> Void
    let onMove: (Double, Double) -> Void
    let onLink: () -> Void
    let onGraph: () -> Void
    let onDelete: () -> Void

    /// Captured in canvas space at drag start. The web version mixes client and canvas
    /// coordinates here, so its dragging only lines up on an unscrolled canvas.
    @State private var dragOrigin: CGPoint?

    private var borderColor: Color {
        isFocused ? Theme.accent : (isLinked ? Theme.accent.opacity(0.45) : Theme.line)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            grip

            TextField("label", text: Binding(get: { node.label }, set: onLabel))
                .textFieldStyle(.plain)
                .font(.system(size: 12))
                .foregroundStyle(Theme.muted)

            HStack(alignment: .firstTextBaseline, spacing: 8) {
                TextField("2 + 2", text: Binding(get: { node.text }, set: onText))
                    .textFieldStyle(.plain)
                    .font(.system(size: 17))
                    .foregroundStyle(Theme.fg)
                    .focused(field, equals: node.id)
                    #if os(iOS)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    #endif

                Button(action: onLink) {
                    Text(node.error != nil ? "?" : format(node.value))
                        .font(.system(size: 17, weight: .medium))
                        .monospacedDigit()
                        .foregroundStyle(Theme.accent)
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Theme.accent.opacity(0.12), in: RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .help("Use this result in the expression you're editing")
            }

            if let error = node.error {
                Text(error).font(.system(size: 12)).foregroundStyle(Theme.danger)
            }

            if node.graph, let ast = node.ast {
                GraphView(ast: ast, lookup: lookup)
            }

            HStack(spacing: 12) {
                Button(node.graph ? "hide graph" : "graph x", action: onGraph)
                Button("delete", action: onDelete)
            }
            .buttonStyle(.plain)
            .font(.system(size: 12))
            .foregroundStyle(Theme.muted)
        }
        .padding(.horizontal, 12).padding(.top, 6).padding(.bottom, 8)
        .frame(width: 260, alignment: .leading)
        .background(Theme.surface, in: RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(borderColor, lineWidth: 1))
    }

    /// A grip instead of a whole-card drag: a DragGesture over the card would fight the
    /// two text fields for the gesture on touch.
    private var grip: some View {
        Capsule()
            .fill(Theme.line)
            .frame(width: 34, height: 4)
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 4)
            .contentShape(Rectangle())
            .gesture(
                DragGesture(coordinateSpace: .named("canvas"))
                    .onChanged { v in
                        let origin = dragOrigin ?? CGPoint(x: node.x, y: node.y)
                        if dragOrigin == nil { dragOrigin = origin }
                        onMove(
                            max(0, origin.x + v.translation.width),
                            max(0, origin.y + v.translation.height)
                        )
                    }
                    .onEnded { _ in dragOrigin = nil }
            )
            #if os(macOS)
            .onHover { inside in
                if inside { NSCursor.openHand.push() } else { NSCursor.pop() }
            }
            #endif
    }
}
