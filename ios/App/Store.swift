// On-device persistence: the canvas survives relaunch.
//
// ponytail: one JSON file in Application Support, same six fields the web app writes
// to localStorage under `numen.sheet.v1`. Deliberately NOT shared with the web sheet —
// cross-device sync is its own roadmap item, not a side effect of the native port.

import Foundation

private struct StoredNode: Codable {
    var id: String
    var x: Double
    var y: Double
    var text: String
    var label: String
    var graph: Bool
}

private struct StoredSheet: Codable {
    var nextId: Int
    var nodes: [StoredNode]
}

enum Store {
    private static var fileURL: URL? {
        guard let dir = try? FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask,
            appropriateFor: nil, create: true
        ) else { return nil }
        return dir.appendingPathComponent("sheet.json")
    }

    static func load() -> Sheet? {
        guard let url = fileURL,
              let data = try? Data(contentsOf: url),
              let stored = try? JSONDecoder().decode(StoredSheet.self, from: data)
        else { return nil }
        var s = Sheet(nextId: stored.nextId, nodes: [])
        s.nodes = stored.nodes.map {
            compiled(Node(id: $0.id, x: $0.x, y: $0.y, text: $0.text, label: $0.label, graph: $0.graph))
        }
        return evaluate(s)
    }

    static func save(_ sheet: Sheet) {
        guard let url = fileURL else { return }
        let stored = StoredSheet(
            nextId: sheet.nextId,
            nodes: sheet.nodes.map {
                StoredNode(id: $0.id, x: $0.x, y: $0.y, text: $0.text, label: $0.label, graph: $0.graph)
            }
        )
        guard let data = try? JSONEncoder().encode(stored) else { return }
        try? data.write(to: url, options: .atomic)
    }
}
