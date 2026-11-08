import SwiftUI
import WebKit

@MainActor
final class SidebarModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var briefs: [String: SessionBrief] = [:]
    @Published var openInTabs: Set<String> = []
    @Published var activeSessionId: String?
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
    /// The app's terminals with no Claude in them, each in the folder it was opened in (MainWindowController.pushTerminals).
    @Published var terminals: [TermRow] = []
    /// Folders opened from the list (its open folder button), the newest first: they stay at its top, chats or none, until
    /// taken out of it or archived. Kept across launches.
    @Published var pinned = UserDefaults.standard.stringArray(forKey: "chatListPinned") ?? [] {
        didSet { UserDefaults.standard.set(pinned, forKey: "chatListPinned") }
    }
    /// Folders folded shut with a click on their strip. Kept across launches.
    @Published var folded = Set(UserDefaults.standard.stringArray(forKey: "chatFolded") ?? []) {
        didSet { UserDefaults.standard.set(Array(folded), forKey: "chatFolded") }
    }

    /// The same folder however it's written (a trailing slash, `..`).
    static func folderKey(_ cwd: String) -> String {
        let p = (cwd as NSString).standardizingPath
        return p.count > 1 && p.hasSuffix("/") ? String(p.dropLast()) : p
    }

    func pin(_ cwd: String) {
        let key = Self.folderKey(cwd)
        if archivedFolders.contains(cwd) { setFolder(cwd, archived: false) }
        pinned.removeAll { Self.folderKey($0) == key }
        pinned.insert(cwd, at: 0)
    }

    func unpin(_ cwd: String) {
        let key = Self.folderKey(cwd)
        pinned.removeAll { Self.folderKey($0) == key }
    }

    func toggleFold(_ cwd: String) {
        let key = Self.folderKey(cwd)
        if folded.contains(key) { folded.remove(key) } else { folded.insert(key) }
    }

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
            // Archived, a folder opened from the list leaves it too.
            unpin(cwd)
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

    /// The list's folders, each a card: the ones opened from the list first (as they were opened), then the rest by their
    /// newest chat, then those only a terminal of the app is in; each with its terminals over its chats. Searching, only the
    /// folders with something that matches.
    var cards: [FolderCard] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        var order: [String] = []
        var map: [String: FolderCard] = [:]
        func card(_ cwd: String) -> String {
            let key = Self.folderKey(cwd)
            if map[key] == nil {
                order.append(key)
                map[key] = FolderCard(cwd: cwd, items: [], terms: [], pinned: false)
            }
            return key
        }
        for p in pinned where !archivedFolders.contains(p) { map[card(p)]?.pinned = true }
        for g in sections.groups { map[card(g.cwd)]?.items = g.items }
        for t in terminals where q.isEmpty || "\(t.title) \(t.job) \(t.cwd)".lowercased().contains(q) {
            map[card(t.cwd)]?.terms.append(t)
        }
        return order.compactMap { map[$0] }.filter { q.isEmpty || !$0.items.isEmpty || !$0.terms.isEmpty }
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

/// One of the app's terminals with no Claude in it, in the chats list: the folder it was opened in, what runs in it,
/// whether its window shows.
struct TermRow: Identifiable, Equatable {
    let id: String
    let cwd: String
    let title: String
    let job: String
    let shown: Bool
}

/// A folder of the chats list: its chats, the app's terminals in it, and whether it was opened from the list.
struct FolderCard {
    let cwd: String
    var items: [ChatItem]
    var terms: [TermRow]
    var pinned: Bool
}

struct SidebarActions {
    let open: (String) -> Void
    let fork: (String) -> Void
    let newTerminal: (String) -> Void
    let reveal: (String) -> Void
    let copyId: (String) -> Void
    /// One of the app's terminals (its car id): shows it, or ends it.
    let openTerminal: (String) -> Void
    let endTerminal: (String) -> Void
    /// The open folder button: a folder from the system's picker, kept in the list, with a terminal in it.
    let openFolder: () -> Void
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
            .padding(.horizontal, 10)
            .padding(.top, 10)

            // A folder from the system's picker: it stays at the top of the list, with a terminal opened in it.
            Button(action: actions.openFolder) {
                HStack(spacing: 6) {
                    Image(systemName: "folder.badge.plus").font(.system(size: 10.5))
                    Text("open folder").font(.mono(10.5, .semibold))
                    Spacer()
                }
                .foregroundColor(Theme.cAccentSoft)
                .padding(.horizontal, 8)
                .frame(height: 24)
                .background(RoundedRectangle(cornerRadius: 4).fill(Theme.cAccent.opacity(0.08)))
                .overlay(RoundedRectangle(cornerRadius: 4).stroke(Theme.cLineSoft, lineWidth: 1))
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .help("Open a folder: it stays at the top of the list, and a terminal opens in it")
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
                let cards = model.cards
                let labels = model.labels(for: cards.map(\.cwd))
                // A plain stack: the lazy one went round placing its rows for ever (the app froze) once rows changed under
                // the pointer while it scrolled.
                VStack(alignment: .leading, spacing: 1) {
                    if !sections.favorites.isEmpty {
                        SectionHeader(icon: "star.fill", title: "favorites", count: sections.favorites.count)
                        ForEach(sections.favorites) { item in row(item) }
                    }
                    ForEach(cards, id: \.cwd) { card in
                        folderCard(card, label: labels[card.cwd] ?? projectLabel(card.cwd))
                    }
                    if cards.isEmpty && sections.favorites.isEmpty {
                        Text(model.query.isEmpty ? "no chats yet · open a folder to start" : "nothing matches")
                            .font(.mono(10))
                            .foregroundColor(Theme.cDim)
                            .padding(.horizontal, 12)
                            .padding(.top, 10)
                    }
                }
                .padding(.bottom, 12)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Theme.cPanel)
        .id(theme.current.id)
    }

    /// A folder as a panel of its own, in the dashboard's panel look: its strip (a click folds it shut or open), the app's
    /// terminals in it, then its chats. It lights up while one of them is in a window.
    private func folderCard(_ card: FolderCard, label: String) -> some View {
        let shut = model.folded.contains(SidebarModel.folderKey(card.cwd)) && model.query.isEmpty
        let expanded = model.expanded.contains(card.cwd) || !model.query.isEmpty
        let live = card.terms.contains(where: \.shown) || card.items.contains { model.openInTabs.contains($0.id) }
        return VStack(alignment: .leading, spacing: 1) {
            header(card, label: label, shut: shut)
            if !shut {
                VStack(alignment: .leading, spacing: 1) {
                    ForEach(card.terms) { t in termRow(t) }
                    ForEach(expanded ? card.items : Array(card.items.prefix(5))) { item in row(item) }
                    if !expanded && card.items.count > 5 {
                        Button {
                            model.expanded.insert(card.cwd)
                        } label: {
                            Text("+\(card.items.count - 5) more")
                                .font(.mono(9.5))
                                .foregroundColor(Theme.cDim)
                                .padding(.leading, 26)
                                .padding(.vertical, 3)
                        }
                        .buttonStyle(.plain)
                    }
                    if card.items.isEmpty && card.terms.isEmpty {
                        HStack(spacing: 4) {
                            Text("nothing here yet ·").font(.mono(9.5)).foregroundColor(Theme.cDim)
                            Button { actions.newTerminal(card.cwd) } label: {
                                Text("open a terminal").font(.mono(9.5, .semibold)).foregroundColor(Theme.cAccentSoft)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .background(FolderCardFrame(live: live))
        .padding(.horizontal, 6)
        .padding(.top, 6)
    }

    /// One of the app's terminals with no Claude in it: what runs in it, and whether its window shows. A click shows it;
    /// ending it is in its menu only, so it can't go by mistake.
    private func termRow(_ t: TermRow) -> some View {
        TerminalRow(term: t)
            .onTapGesture { actions.openTerminal(t.id) }
            .contextMenu {
                Button("Show Terminal") { actions.openTerminal(t.id) }
                Button("New Terminal in This Folder") { actions.newTerminal(t.cwd) }
                Button("Show Folder in Finder") { actions.reveal(t.cwd) }
                Divider()
                Button("End Terminal") { actions.endTerminal(t.id) }
            }
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

    /// A folder card's strip: a click folds it shut or open, ⌘-click picks it for the bulk bar.
    private func header(_ card: FolderCard, label: String, shut: Bool) -> some View {
        let cwd = card.cwd
        return ProjectHeader(cwd: cwd, label: label, count: card.items.count + card.terms.count, terms: card.terms.count,
                             pinned: card.pinned, shut: shut, archived: false, selected: model.selectedFolders.contains(cwd),
                             bulk: model.selectedFolders.count, onNew: { actions.newTerminal(cwd) },
                             onArchive: { withAnimation(.easeInOut(duration: 0.25)) { model.setFolder(cwd, archived: true) } },
                             onSelect: { model.selectFolder(cwd) },
                             onFold: { withAnimation(.easeInOut(duration: 0.2)) { model.toggleFold(cwd) } },
                             onUnpin: { withAnimation(.easeInOut(duration: 0.25)) { model.unpin(cwd) } },
                             onReveal: { actions.reveal(cwd) },
                             onBulk: { on in withAnimation(.easeInOut(duration: 0.25)) { model.setSelectedFolders(archived: on) } })
    }

    private func row(_ item: ChatItem) -> some View {
        let favorite = model.favorites.contains(item.id), archived = model.isArchived(item)
        return ChatRow(item: item, title: model.title(of: item), renaming: model.renaming == item.id,
                       onRename: { name in
                           if let name { model.rename(item.id, to: name) } else { model.renaming = nil }
                       },
                       brief: model.briefs[item.id], inTab: model.openInTabs.contains(item.id),
                       isActive: model.activeSessionId == item.id, favorite: favorite,
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
    /// The app's terminals in it, whether it was opened from the list, and whether it's folded shut.
    let terms: Int
    let pinned: Bool
    let shut: Bool
    /// In the ARCHIVED section: its button takes the whole folder out of the archive.
    let archived: Bool
    /// Picked for the bulk bar (⌘-click on the strip), and how many are.
    let selected: Bool
    let bulk: Int
    let onNew: () -> Void
    let onArchive: () -> Void
    let onSelect: () -> Void
    let onFold: () -> Void
    let onUnpin: () -> Void
    let onReveal: () -> Void
    let onBulk: (Bool) -> Void
    @State private var hover = false

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "chevron.right")
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(Theme.cDim)
                .rotationEffect(.degrees(shut ? 0 : 90))
                .frame(width: 9)
            Image(systemName: pinned ? "pin.fill" : "folder").font(.system(size: 9.5)).foregroundColor(Theme.cAccent.opacity(0.8))
                .help(pinned ? "Opened from the list" : "")
            Text(label)
                .font(.mono(10, .semibold))
                .foregroundColor(Theme.cAccentSoft)
                .lineLimit(1)
                .truncationMode(.head)
            Text("\(count)").font(.mono(9)).foregroundColor(Theme.cDim2)
            if terms > 0 {
                HStack(spacing: 2) {
                    Image(systemName: "terminal").font(.system(size: 8.5))
                    Text("\(terms)").font(.mono(9))
                }
                .foregroundColor(Theme.cDim)
                .help("\(terms) terminal\(terms > 1 ? "s" : "") in the app")
            }
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
        .padding(.horizontal, 8)
        .frame(height: 26)
        // The card's strip, as a dashboard panel's.
        .background(
            Rectangle().fill(selected ? Theme.cAccent.opacity(0.2) : Theme.cAccent.opacity(hover ? 0.1 : 0.06))
        )
        .overlay(alignment: .bottom) { Rectangle().fill(Theme.cLineSoft).frame(height: 1).opacity(shut ? 0 : 1) }
        // All of it hovers, the empty middle too: on the way to its buttons the pointer crossed nothing, they vanished.
        .contentShape(Rectangle())
        .onTapGesture {
            // ⌘-click picks it for archiving several at once; a click folds it shut or open.
            if NSEvent.modifierFlags.contains(.command) { onSelect() } else { onFold() }
        }
        .help(selected ? "Selected · ⌘-click again to leave it out"
              : "\(tildify(cwd)) · click to fold \(shut ? "open" : "shut") · ⌘-click to select, for archiving several at once")
        .onHover { hover = $0 }
        .contextMenu {
            if bulk > 1 && selected {
                Button("Archive the \(bulk) Selected Folders") { onBulk(true) }
                Button("Unarchive the \(bulk) Selected Folders") { onBulk(false) }
                Divider()
            }
            Button("New Terminal in This Folder", action: onNew)
            Button("Show Folder in Finder", action: onReveal)
            Divider()
            Button(archived ? "Unarchive Folder" : "Archive Folder", action: onArchive)
            Button(selected ? "Deselect" : "Select", action: onSelect)
            if pinned { Button("Remove from the List", action: onUnpin) }
        }
    }
}

/// A folder card's frame, in the dashboard's panel look: a thin line with the accent's corner marks; brighter, with a
/// glow, while one of its chats or terminals is in a window.
private struct FolderCardFrame: View {
    let live: Bool

    var body: some View {
        ZStack {
            Rectangle().fill(Theme.cAccent.opacity(live ? 0.05 : 0.02))
            Rectangle().stroke(live ? Theme.cLine : Theme.cLineSoft, lineWidth: 1)
            CornerMarks().stroke(Theme.cAccent.opacity(live ? 1 : 0.75), lineWidth: 1.5)
        }
        .shadow(color: live ? Theme.cAccent.opacity(0.35) : .clear, radius: live ? 6 : 0)
    }
}

/// The short L at each corner of a dashboard panel.
private struct CornerMarks: Shape {
    func path(in r: CGRect) -> Path {
        let k: CGFloat = 7
        var p = Path()
        p.move(to: CGPoint(x: r.minX, y: r.minY + k)); p.addLine(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.minX + k, y: r.minY))
        p.move(to: CGPoint(x: r.maxX - k, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY + k))
        p.move(to: CGPoint(x: r.maxX, y: r.maxY - k)); p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.maxX - k, y: r.maxY))
        p.move(to: CGPoint(x: r.minX + k, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY - k))
        return p
    }
}

/// One of the app's terminals with no Claude in it, in its folder's card.
private struct TerminalRow: View {
    let term: TermRow
    @State private var hover = false

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: "terminal")
                .font(.system(size: 10))
                .foregroundColor(term.job.isEmpty ? Theme.cDim : Theme.cAccent)
                .frame(width: 14)
            VStack(alignment: .leading, spacing: 1) {
                Text(term.title.isEmpty ? "terminal" : term.title)
                    .font(.mono(11, term.shown ? .semibold : .regular))
                    .foregroundColor(Theme.cHi)
                    .lineLimit(1)
                Text((["terminal", term.job.isEmpty ? "idle" : term.job] + (term.shown ? ["showing"] : [])).joined(separator: " · "))
                    .font(.mono(9.5))
                    .foregroundColor(Theme.cDim)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(term.shown ? Theme.cAccent.opacity(0.14) : (hover ? Theme.cAccent.opacity(0.06) : .clear))
        )
        .padding(.horizontal, 4)
        .contentShape(Rectangle())
        .onHover { hover = $0 }
        .help("\(term.title) · \(tildify(term.cwd))")
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
    let isActive: Bool
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
                        .font(.mono(11, isActive ? .semibold : .regular))
                        .foregroundColor(isActive || live ? Theme.cHi : Theme.cText)
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
                .fill(isActive ? Theme.cAccent.opacity(0.18) : (inTab ? Theme.cAccent.opacity(0.10) : (hover ? Theme.cAccent.opacity(0.06) : .clear)))
        )
        .overlay(alignment: .leading) {
            if isActive {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Theme.cAccent)
                    .frame(width: 2.5)
                    .padding(.vertical, 4)
            }
        }
        .padding(.horizontal, 6)
        .contentShape(Rectangle())
        .onHover { hover = $0 }
        .help(item.lastPrompt.isEmpty ? title : item.lastPrompt)
    }

    private func meta(live: Bool, status: String?) -> String {
        var bits = [relative(item.mtime)]
        if item.size > 0 { bits.append(fmtBytes(item.size)) }
        if isActive {
            bits.append("active window")
        } else if inTab {
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
