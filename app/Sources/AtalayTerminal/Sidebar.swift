import SwiftUI
import WebKit

@MainActor
final class SidebarModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var briefs: [String: SessionBrief] = [:]
    @Published var openInTabs: Set<String> = []
    @Published var query = ""
    @Published var expanded: Set<String> = []
    /// Starred chats, in their own section at the top; archived ones out of the list altogether (Settings lists them, as
    /// Claude's and ChatGPT's do, so a stream shows only what's meant to be seen). Kept across launches.
    @Published var favorites = Set(UserDefaults.standard.stringArray(forKey: "chatFavorites") ?? []) {
        didSet { UserDefaults.standard.set(Array(favorites), forKey: "chatFavorites") }
    }
    @Published var archived = Set(UserDefaults.standard.stringArray(forKey: "chatArchived") ?? []) {
        didSet { UserDefaults.standard.set(Array(archived), forKey: "chatArchived") }
    }
    /// Whole folders archived (their chats, later ones too), and chats taken back out of one.
    @Published var archivedFolders = Set(UserDefaults.standard.stringArray(forKey: "chatArchivedFolders") ?? []) {
        didSet { UserDefaults.standard.set(Array(archivedFolders), forKey: "chatArchivedFolders") }
    }
    @Published var restored = Set(UserDefaults.standard.stringArray(forKey: "chatRestored") ?? []) {
        didSet { UserDefaults.standard.set(Array(restored), forKey: "chatRestored") }
    }
    /// Names given to chats (right-click → Rename), over Claude's own titles; kept across launches.
    @Published var customTitles = UserDefaults.standard.dictionary(forKey: "chatTitles") as? [String: String] ?? [:] {
        didSet { UserDefaults.standard.set(customTitles, forKey: "chatTitles") }
    }
    /// The chat whose name is being edited in its row.
    @Published var renaming: String?

    func title(of item: ChatItem) -> String {
        customTitles[item.id] ?? (item.title.isEmpty ? item.lastPrompt : item.title)
    }

    /// A new name for a chat; empty gives it back its own.
    func rename(_ id: String, to name: String) {
        let clean = name.trimmingCharacters(in: .whitespacesAndNewlines)
        customTitles[id] = clean.isEmpty ? nil : String(clean.prefix(120))
        renaming = nil
    }

    /// Folders picked with a click on their header, for archiving (or unarchiving) them all at once.
    @Published var selectedFolders: Set<String> = []

    func selectFolder(_ cwd: String) {
        if selectedFolders.remove(cwd) == nil { selectedFolders.insert(cwd) }
    }

    func setSelectedFolders(archived on: Bool) {
        for cwd in selectedFolders { setFolder(cwd, archived: on) }
        selectedFolders = []
    }

    func isArchived(_ item: ChatItem) -> Bool {
        (archived.contains(item.id) || archivedFolders.contains(item.cwd)) && !restored.contains(item.id)
    }

    func toggleFavorite(_ item: ChatItem) {
        guard favorites.remove(item.id) == nil else { return }
        favorites.insert(item.id)
        if isArchived(item) { toggleArchived(item) }
    }

    /// One chat in or out of the archive; out of an archived folder, it alone comes back.
    func toggleArchived(_ item: ChatItem) {
        if isArchived(item) {
            archived.remove(item.id)
            if archivedFolders.contains(item.cwd) { restored.insert(item.id) }
        } else {
            archived.insert(item.id)
            restored.remove(item.id)
            favorites.remove(item.id)
        }
    }

    /// A whole folder in or out of the archive. Out, everything in it comes back, chats archived one by one too.
    func setFolder(_ cwd: String, archived on: Bool) {
        let ids = Set(groups.first { $0.cwd == cwd }?.items.map(\.id) ?? [])
        if on {
            archivedFolders.insert(cwd)
            restored.subtract(ids)
            favorites.subtract(ids)
        } else {
            archivedFolders.remove(cwd)
            archived.subtract(ids)
            restored.subtract(ids)
        }
    }

    /// The list as it shows: the starred chats, then the rest by project. The archived ones are in Settings.
    var sections: (favorites: [ChatItem], groups: [(cwd: String, items: [ChatItem])]) {
        let all = groups.flatMap(\.items)
        let favs = all.filter { favorites.contains($0.id) && !isArchived($0) }
        let rest = groups.compactMap { g -> (cwd: String, items: [ChatItem])? in
            let items = g.items.filter { !favorites.contains($0.id) && !isArchived($0) }
            return items.isEmpty ? nil : (g.cwd, items)
        }
        return (favs, rest)
    }

    /// Every chat, newest first; live sessions without a saved title too.
    private var everything: [ChatItem] {
        var all = items
        let known = Set(items.map(\.id))
        for b in briefs.values where b.live && !known.contains(b.id) && !b.cwd.isEmpty {
            all.append(ChatItem(id: b.id, path: "", cwd: b.cwd, mtime: Date().timeIntervalSince1970 * 1000, size: 0,
                                title: b.title.isEmpty ? "new chat · \(b.name)" : b.title, lastPrompt: ""))
        }
        return all.sorted { $0.mtime > $1.mtime }
    }

    /// For Settings (ArchiveBridge): the archived chats by folder, each folder's newest first.
    func archivedList() -> [[String: Any]] {
        var order: [String] = []
        var map: [String: [ChatItem]] = [:]
        for it in everything where isArchived(it) {
            if map[it.cwd] == nil { order.append(it.cwd) }
            map[it.cwd, default: []].append(it)
        }
        let names = labels(for: order)
        return order.map { cwd in
            ["cwd": cwd, "label": names[cwd] ?? projectLabel(cwd), "whole": archivedFolders.contains(cwd),
             "chats": (map[cwd] ?? []).map { ["id": $0.id, "title": $0.title.isEmpty ? $0.lastPrompt : $0.title, "at": $0.mtime] }]
        }
    }

    func restore(_ id: String) {
        if let item = everything.first(where: { $0.id == id }), isArchived(item) { toggleArchived(item) }
    }

    func restoreAll() {
        archived = []
        archivedFolders = []
        restored = []
    }

    /// Projects ordered by their most recent chat; live sessions without a saved title still show up.
    var groups: [(cwd: String, items: [ChatItem])] {
        var all = everything
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            all = all.filter { "\(customTitles[$0.id] ?? "") \($0.title) \($0.lastPrompt) \($0.cwd)".lowercased().contains(q) }
        }
        var order: [String] = []
        var map: [String: [ChatItem]] = [:]
        for it in all {
            if map[it.cwd] == nil { order.append(it.cwd) }
            map[it.cwd, default: []].append(it)
        }
        return order.map { ($0, map[$0]!) }
    }

    func labels(for cwds: [String]) -> [String: String] { distinctLabels(for: cwds) }
}

struct SidebarActions {
    let open: (String) -> Void
    let fork: (String) -> Void
    let newTerminal: (String) -> Void
    let reveal: (String) -> Void
    let copyId: (String) -> Void
    /// The list closes (sliding, as with its shortcut).
    let close: () -> Void
}

struct SidebarView: View {
    @ObservedObject var model: SidebarModel
    let actions: SidebarActions
    @ObservedObject var theme = ThemeStore.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("chats")
                    .font(.mono(10.5, .bold))
                    .foregroundColor(Theme.cInk)
                    .padding(.horizontal, 8)
                    .frame(height: 19)
                    .background(Theme.cAccent)
                Text("\(model.items.count) saved · \(model.briefs.values.filter(\.live).count) live")
                    .font(.mono(9.5))
                    .foregroundColor(Theme.cDim)
                Spacer()
                // Its shortcut, and a close button: it slides shut.
                Text(Shortcuts.label(Shortcuts.combo("chatsList")))
                    .font(.mono(9.5))
                    .foregroundColor(Theme.cDim2)
                Button(action: actions.close) {
                    Image(systemName: "xmark").font(.system(size: 9, weight: .bold)).foregroundColor(Theme.cDim)
                }
                .buttonStyle(.plain)
                .help("Close the chats list")
            }
            .padding(.top, 8)
            .padding(.horizontal, 10)

            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass").font(.system(size: 10)).foregroundColor(Theme.cDim)
                TextField("search: title, prompt, folder", text: $model.query)
                    .textFieldStyle(.plain)
                    .font(.mono(11))
                    .foregroundColor(Theme.cText)
            }
            .padding(.horizontal, 8)
            .frame(height: 26)
            .background(RoundedRectangle(cornerRadius: 4).fill(Color.black.opacity(0.25)))
            .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.cLineSoft, lineWidth: 1))
            .padding(10)

            // Folders picked (a click on their headers): archive or unarchive them all at once.
            if !model.selectedFolders.isEmpty {
                HStack(spacing: 8) {
                    Text("\(model.selectedFolders.count) selected")
                        .font(.mono(10, .semibold))
                        .lineLimit(1)
                        .foregroundColor(Theme.cAccentSoft)
                    Spacer()
                    bulkButton("archive") { model.setSelectedFolders(archived: true) }
                    Button {
                        model.selectedFolders = []
                    } label: {
                        Image(systemName: "xmark").font(.system(size: 9, weight: .bold)).foregroundColor(Theme.cDim)
                    }
                    .buttonStyle(.plain)
                    .help("Clear the selection")
                }
                .padding(.horizontal, 10)
                .padding(.bottom, 6)
            }

            ScrollView {
                let sections = model.sections
                let groups = sections.groups
                let labels = model.labels(for: groups.map(\.cwd))
                // A plain stack: the lazy one went round placing its rows for ever (the app froze) once rows changed under
                // the pointer while it scrolled.
                VStack(alignment: .leading, spacing: 1) {
                    if !sections.favorites.isEmpty {
                        SectionHeader(icon: "star.fill", title: "favorites", count: sections.favorites.count)
                        ForEach(sections.favorites) { item in row(item) }
                    }
                    ForEach(groups, id: \.cwd) { group in
                        header(group.cwd, labels[group.cwd] ?? projectLabel(group.cwd), group.items.count, archived: false)
                        let expanded = model.expanded.contains(group.cwd) || !model.query.isEmpty
                        ForEach(expanded ? group.items : Array(group.items.prefix(5))) { item in row(item) }
                        if !expanded && group.items.count > 5 {
                            Button {
                                model.expanded.insert(group.cwd)
                            } label: {
                                Text("+\(group.items.count - 5) more")
                                    .font(.mono(9.5))
                                    .foregroundColor(Theme.cDim)
                                    .padding(.leading, 26)
                                    .padding(.vertical, 3)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.bottom, 12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.cPanel)
        .id(theme.current.id)
    }

    private func bulkButton(_ title: String, _ action: @escaping () -> Void) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.25)) { action() }
        } label: {
            Text(title)
                .font(.mono(10, .semibold))
                .foregroundColor(Theme.cInk)
                .padding(.horizontal, 8)
                .frame(height: 18)
                .background(RoundedRectangle(cornerRadius: 3).fill(Theme.cAccent))
        }
        .buttonStyle(.plain)
    }

    /// A folder's header, in the list or in ARCHIVED: a click picks it for the bulk bar.
    private func header(_ cwd: String, _ label: String, _ count: Int, archived: Bool) -> some View {
        ProjectHeader(cwd: cwd, label: label, count: count, archived: archived, selected: model.selectedFolders.contains(cwd),
                      bulk: model.selectedFolders.count, onNew: { actions.newTerminal(cwd) },
                      onArchive: { withAnimation(.easeInOut(duration: 0.25)) { model.setFolder(cwd, archived: !archived) } },
                      onSelect: { model.selectFolder(cwd) },
                      onBulk: { on in withAnimation(.easeInOut(duration: 0.25)) { model.setSelectedFolders(archived: on) } })
    }

    private func row(_ item: ChatItem) -> some View {
        let favorite = model.favorites.contains(item.id), archived = model.isArchived(item)
        return ChatRow(item: item, title: model.title(of: item), renaming: model.renaming == item.id,
                       onRename: { name in
                           if let name { model.rename(item.id, to: name) } else { model.renaming = nil }
                       },
                       brief: model.briefs[item.id], inTab: model.openInTabs.contains(item.id), favorite: favorite,
                       archived: archived,
                       onStar: { withAnimation(.easeInOut(duration: 0.25)) { model.toggleFavorite(item) } },
                       onArchive: { withAnimation(.easeInOut(duration: 0.25)) { model.toggleArchived(item) } })
            .onTapGesture { actions.open(item.id) }
            .contextMenu {
                Button("Rename…") { model.renaming = item.id }
                Button(favorite ? "Remove from Favorites" : "Add to Favorites") {
                    withAnimation(.easeInOut(duration: 0.25)) { model.toggleFavorite(item) }
                }
                Button(archived ? "Unarchive" : "Archive") {
                    withAnimation(.easeInOut(duration: 0.25)) { model.toggleArchived(item) }
                }
                Divider()
                Button("Open in a Window") { actions.open(item.id) }
                Button("Open a Copy (fork)") { actions.fork(item.id) }
                Button("New Terminal in This Folder") { actions.newTerminal(item.cwd) }
                Divider()
                Button("Show Folder in Finder") { actions.reveal(item.cwd) }
                Button("Copy Session ID") { actions.copyId(item.id) }
            }
    }
}

/// FAVORITES at the top of the list, ARCHIVED at its foot.
private struct SectionHeader: View {
    let icon: String
    let title: String
    let count: Int

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon).font(.system(size: 9.5)).foregroundColor(Theme.cAccent.opacity(0.85))
            Text(title.uppercased()).font(.mono(10, .semibold)).foregroundColor(Theme.cAccentSoft)
            Text("\(count)").font(.mono(9)).foregroundColor(Theme.cDim2)
            Spacer()
        }
        .padding(.horizontal, 10)
        .padding(.top, 10)
        .padding(.bottom, 3)
        .contentShape(Rectangle())
    }
}

private struct ProjectHeader: View {
    let cwd: String
    let label: String
    let count: Int
    /// In the ARCHIVED section: its button takes the whole folder out of the archive.
    let archived: Bool
    /// Picked for the bulk bar (a click on the header), and how many are.
    let selected: Bool
    let bulk: Int
    let onNew: () -> Void
    let onArchive: () -> Void
    let onSelect: () -> Void
    let onBulk: (Bool) -> Void
    @State private var hover = false

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "folder").font(.system(size: 9.5)).foregroundColor(Theme.cAccent.opacity(0.8))
            Text(label)
                .font(.mono(10, .semibold))
                .foregroundColor(Theme.cAccentSoft)
                .lineLimit(1)
                .truncationMode(.head)
            Text("\(count)").font(.mono(9)).foregroundColor(Theme.cDim2)
            Spacer()
            // On hover: the whole folder in or out of the archive (one chat in it can come back alone). Always laid out.
            Button(action: onArchive) {
                Image(systemName: archived ? "tray.and.arrow.up" : "archivebox").font(.system(size: 9.5)).foregroundColor(Theme.cDim)
            }
            .buttonStyle(.plain)
            .opacity(hover ? 1 : 0)
            .allowsHitTesting(hover)
            .help(archived ? "Unarchive the folder: all its chats back in the list" : "Archive the folder: all its chats out of the list")
            Button(action: onNew) {
                Image(systemName: "plus").font(.system(size: 9, weight: .bold)).foregroundColor(Theme.cAccent)
            }
            .buttonStyle(.plain)
            .opacity(hover ? 1 : 0.35)
            .help("New terminal in this folder")
        }
        .padding(.horizontal, 10)
        .padding(.top, 10)
        .padding(.bottom, 3)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(selected ? Theme.cAccent.opacity(0.16) : .clear)
                .padding(.horizontal, 6)
                .padding(.top, 6)
        )
        // All of it hovers, the empty middle too: on the way to its buttons the pointer crossed nothing, they vanished.
        .contentShape(Rectangle())
        .onTapGesture(perform: onSelect)
        .help(selected ? "Selected · click again to leave it out" : "\(tildify(cwd)) · click to select, for archiving several at once")
        .onHover { hover = $0 }
        .contextMenu {
            if bulk > 1 && selected {
                Button("Archive the \(bulk) Selected Folders") { onBulk(true) }
                Button("Unarchive the \(bulk) Selected Folders") { onBulk(false) }
                Divider()
            }
            Button(archived ? "Unarchive Folder" : "Archive Folder", action: onArchive)
            Button(selected ? "Deselect" : "Select", action: onSelect)
            Button("New Terminal in This Folder", action: onNew)
        }
    }
}

private struct ChatRow: View {
    let item: ChatItem
    /// Its name (one the user gave it, else Claude's title), and whether it's being renamed in place.
    let title: String
    let renaming: Bool
    /// The new name, or nil when the rename is called off (Esc).
    let onRename: (String?) -> Void
    let brief: SessionBrief?
    let inTab: Bool
    let favorite: Bool
    let archived: Bool
    let onStar: () -> Void
    let onArchive: () -> Void
    @State private var hover = false
    @State private var draft = ""
    @FocusState private var editing: Bool

    var body: some View {
        let live = brief?.live == true
        let status = live ? brief?.status : nil
        HStack(spacing: 8) {
            StatusDot(status: status ?? "ended", size: 7, hollow: !live)
                .id(status ?? "ended")
            VStack(alignment: .leading, spacing: 1) {
                if renaming {
                    // Enter keeps it, Esc calls it off; an empty name gives the chat back its own.
                    TextField("name", text: $draft)
                        .textFieldStyle(.plain)
                        .font(.mono(11))
                        .foregroundColor(Theme.cHi)
                        .focused($editing)
                        .onSubmit { onRename(draft) }
                        .onExitCommand { onRename(nil) }
                        .onAppear {
                            draft = title
                            editing = true
                        }
                        .padding(.horizontal, 3)
                        .background(RoundedRectangle(cornerRadius: 3).stroke(Theme.cAccent, lineWidth: 1))
                } else {
                    Text(title)
                        .font(.mono(11))
                        .foregroundColor(live ? Theme.cHi : Theme.cText)
                        .lineLimit(1)
                }
                Text(meta(live: live, status: status))
                    .font(.mono(9))
                    .foregroundColor(status == "waiting" ? Theme.cAlert : Theme.cDim)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
            // On hover: star it (to the top) or archive it (out of the list). A starred one keeps its star. Always laid out,
            // only shown or not: a row that changed size under the pointer kept the list re-placing itself.
            Button(action: onStar) {
                Image(systemName: favorite ? "star.fill" : "star")
                    .font(.system(size: 10))
                    .foregroundColor(favorite ? Theme.cAmber : Theme.cDim)
            }
            .buttonStyle(.plain)
            .opacity(hover || favorite ? 1 : 0)
            .allowsHitTesting(hover || favorite)
            .help(favorite ? "Remove from favorites" : "Add to favorites: it stays at the top")
            Button(action: onArchive) {
                Image(systemName: archived ? "tray.and.arrow.up" : "archivebox")
                    .font(.system(size: 10))
                    .foregroundColor(Theme.cDim)
            }
            .buttonStyle(.plain)
            .opacity(hover ? 1 : 0)
            .allowsHitTesting(hover)
            .help(archived ? "Unarchive: back in the list" : "Archive: out of the list (under ARCHIVED, closed)")
        }
        .padding(.leading, 14)
        .padding(.trailing, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(inTab ? Theme.cAccent.opacity(0.10) : (hover ? Theme.cAccent.opacity(0.06) : .clear))
        )
        .padding(.horizontal, 6)
        .contentShape(Rectangle())
        .onHover { hover = $0 }
        .help(item.lastPrompt.isEmpty ? title : item.lastPrompt)
    }

    private func meta(live: Bool, status: String?) -> String {
        var bits = [relative(item.mtime)]
        if item.size > 0 { bits.append(fmtBytes(item.size)) }
        if inTab {
            bits.append("in a window")
        } else if live {
            bits.append(brief?.host == "term" ? "in another terminal" : "live")
        }
        if status == "waiting" { bits.append("NEEDS YOU") } else if status == "idle", live { bits.append("your turn") }
        return bits.joined(separator: " · ")
    }

    private func relative(_ ms: Double) -> String {
        let s = max(0, Date().timeIntervalSince1970 - ms / 1000)
        if s < 60 { return "now" }
        if s < 3600 { return "\(Int(s / 60))m" }
        if s < 86_400 { return "\(Int(s / 3600))h" }
        if s < 86_400 * 30 { return "\(Int(s / 86_400))d" }
        return "\(Int(s / (86_400 * 30)))mo"
    }
}

/// Settings' archived chats (web/cloud.js), out of the chats list as in Claude's and ChatGPT's settings: the list by
/// folder, and taking a chat, a folder or all of them back out.
final class ArchiveBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var model: SidebarModel?

    init(model: SidebarModel) { self.model = model }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard let model else { return replyHandler(nil, "no chats list") }
            switch body["type"] as? String {
            case "list": break
            case "restore": if let id = body["id"] as? String { model.restore(id) }
            case "restoreFolder": if let cwd = body["cwd"] as? String { model.setFolder(cwd, archived: false) }
            case "restoreAll": model.restoreAll()
            default: return replyHandler(nil, "unknown request")
            }
            replyHandler(["folders": model.archivedList()], nil)
        }
    }
}
