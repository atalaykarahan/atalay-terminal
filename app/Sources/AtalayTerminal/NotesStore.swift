import CryptoKit
import Foundation
import WebKit

/// The dashboard's notes (web/notes.js), kept in the app's folder on this Mac: a file for each note, and one for their
/// order and the note pinned to the dashboard. Every file is encrypted (AES-GCM with a 256-bit key) and bound to its
/// name, so a file copied over another doesn't open either; the key is made on this Mac and kept in a file of the
/// app's own that only this user can read (KeyFile).
final class NotesStore {
    static let shared = NotesStore(dir: NotesStore.folder) { try NotesKey.get(create: $0) }

    /// Application Support/atalay-terminal/Notes, the staging build's apart (its key is another).
    static var folder: URL {
        let staging = Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true
        return (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: HOME + "/Library/Application Support"))
            .appendingPathComponent(staging ? "atalay-terminal/Notes (staging)" : "atalay-terminal/Notes")
    }

    enum Failure: Error, CustomStringConvertible {
        /// There are notes, and no key to read them.
        case keyMissing
        /// The key's file isn't a key, or a new one couldn't be written.
        case keyFile
        case notANote(String)
        case badRequest

        var description: String {
            switch self {
            case .keyMissing: return "the notes' key is missing"
            case .keyFile: return "the notes' key couldn't be read or saved"
            case .notANote(let name): return "\(name) isn't a note"
            case .badRequest: return "bad request"
            }
        }
    }

    /// What a file starts with: that it's a note, and the version of how it's laid out.
    static let header = Data("note".utf8) + Data([1])
    /// The file of the notes' order and the pinned one: a name no note has (theirs are letters, digits and dashes).
    static let indexName = "_index"

    let dir: URL
    /// Reads and writes, one at a time.
    let queue = DispatchQueue(label: "notes.store", qos: .userInitiated)
    private let makeKey: (_ create: Bool) throws -> SymmetricKey
    private var key: SymmetricKey?
    /// Each file's content as read or written here: a note is written again only when it changed, and only a file read
    /// or written here is ever deleted (one that couldn't be read stays as it is).
    private var known: [String: Data] = [:]

    init(dir: URL, key: @escaping (_ create: Bool) throws -> SymmetricKey) {
        self.dir = dir
        makeKey = key
    }

    static func validName(_ name: String) -> Bool {
        !name.isEmpty && name.count <= 100 && name.unicodeScalars.allSatisfy { $0.isASCII && (CharacterSet.alphanumerics.contains($0) || $0 == "-") }
    }

    private func url(_ name: String) -> URL { dir.appendingPathComponent(name + ".note") }

    private func stored() -> [String] {
        ((try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []).filter { $0.hasSuffix(".note") }.map { String($0.dropLast(5)) }
    }

    /// The key, made the first time only while there's no note it would have to read.
    private func theKey(create: Bool) throws -> SymmetricKey {
        if let key { return key }
        let made = try makeKey(create && stored().isEmpty)
        key = made
        return made
    }

    static func seal(_ plain: Data, as name: String, with key: SymmetricKey) throws -> Data {
        let box = try AES.GCM.seal(plain, using: key, authenticating: header + Data(name.utf8))
        guard let combined = box.combined else { throw Failure.notANote(name) }
        return header + combined
    }

    static func open(_ file: Data, as name: String, with key: SymmetricKey) throws -> Data {
        guard file.count >= header.count + 28, file.prefix(header.count) == header else { throw Failure.notANote(name) }
        let box = try AES.GCM.SealedBox(combined: Data(file.dropFirst(header.count)))
        return try AES.GCM.open(box, using: key, authenticating: header + Data(name.utf8))
    }

    /// Every note, in their order, as the page keeps them ({ v, ordered, pinned, current, notes }, JSON); nil when there
    /// are none yet.
    func load() throws -> String? {
        let names = stored()
        guard !names.isEmpty else { return nil }
        let key = try theKey(create: false)
        var index: [String: Any] = [:]
        var notes: [String: [String: Any]] = [:]
        for name in names where name == Self.indexName || Self.validName(name) {
            guard let file = try? Data(contentsOf: url(name)), let plain = try? Self.open(file, as: name, with: key),
                  let object = (try? JSONSerialization.jsonObject(with: plain)) as? [String: Any] else { continue }
            known[name] = plain
            if name == Self.indexName {
                index = object
            } else if object["id"] as? String == name {
                notes[name] = object
            }
        }
        let order = (index["order"] as? [String] ?? []).filter { notes[$0] != nil }
        let changed = { (id: String) in (notes[id]?["at"] as? Double) ?? 0 }
        let rest = notes.keys.filter { !order.contains($0) }.sorted { changed($0) > changed($1) }
        var pad: [String: Any] = ["v": 3, "ordered": index["ordered"] as? Bool ?? false, "notes": (order + rest).compactMap { notes[$0] }]
        if let pinned = index["pinned"] as? String { pad["pinned"] = pinned }
        if let current = index["current"] as? String { pad["current"] = current }
        return String(data: try JSONSerialization.data(withJSONObject: pad), encoding: .utf8)
    }

    /// The notes as the page has them now (JSON): each that changed written again, each no longer there deleted.
    func save(_ json: String) throws {
        guard let pad = (try? JSONSerialization.jsonObject(with: Data(json.utf8))) as? [String: Any],
              let list = pad["notes"] as? [[String: Any]] else { throw Failure.badRequest }
        let key = try theKey(create: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        var order: [String] = []
        for note in list {
            guard let id = note["id"] as? String, Self.validName(id), !order.contains(id) else { continue }
            order.append(id)
            try write(note, as: id, with: key)
        }
        var index: [String: Any] = ["v": pad["v"] as? Int ?? 3, "ordered": pad["ordered"] as? Bool ?? true, "order": order]
        if let pinned = pad["pinned"] as? String { index["pinned"] = pinned }
        if let current = pad["current"] as? String { index["current"] = current }
        try write(index, as: Self.indexName, with: key)
        let keep = Set(order + [Self.indexName])
        for name in known.keys where !keep.contains(name) {
            try? FileManager.default.removeItem(at: url(name))
            known[name] = nil
        }
    }

    private func write(_ object: [String: Any], as name: String, with key: SymmetricKey) throws {
        let plain = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
        guard known[name] != plain else { return }
        let file = url(name)
        try Self.seal(plain, as: name, with: key).write(to: file, options: [.atomic])
        try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: file.path)
        known[name] = plain
    }
}

/// The notes' key: 32 random bytes in a file of the app's own (KeyFile), the staging build's apart.
enum NotesKey {
    static var name: String { Bundle.main.bundleIdentifier?.hasSuffix(".staging") == true ? "notes-staging" : "notes" }

    static func get(create: Bool) throws -> SymmetricKey { try get(name: name, create: create) }

    static func get(name: String, create: Bool) throws -> SymmetricKey {
        if let data = KeyFile.load(name) {
            // A file that isn't a key is left as it is: a new key in its place would open none of the notes.
            guard data.count == 32 else { throw NotesStore.Failure.keyFile }
            return SymmetricKey(data: data)
        }
        guard create else { throw NotesStore.Failure.keyMissing }
        let key = SymmetricKey(size: .bits256)
        if KeyFile.save(name, key.withUnsafeBytes { Data($0) }, fresh: true) { return key }
        // Made at the same moment elsewhere: that one is the key.
        if KeyFile.load(name) != nil { return try get(name: name, create: false) }
        throw NotesStore.Failure.keyFile
    }
}

/// The dashboard's notes (web/notes.js) to and from NotesStore: { type: "load" } answers { json } (null with no notes
/// yet), { type: "save", json } answers { ok }; either answers { error } when it can't.
final class NotesBridge: NSObject, WKScriptMessageHandlerWithReply {
    private let store: NotesStore

    init(store: NotesStore = .shared) { self.store = store }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        let type = body["type"] as? String, json = body["json"] as? String
        let store = self.store
        store.queue.async {
            var answer: [String: Any]
            do {
                switch type {
                case "load": answer = ["json": try store.load() ?? NSNull()]
                case "save":
                    guard let json else { throw NotesStore.Failure.badRequest }
                    try store.save(json)
                    answer = ["ok": true]
                default: answer = ["error": "unknown request"]
                }
            } catch {
                answer = ["error": String(describing: error)]
            }
            let reply = answer
            DispatchQueue.main.async { MainActor.assumeIsolated { replyHandler(reply, nil) } }
        }
    }
}
