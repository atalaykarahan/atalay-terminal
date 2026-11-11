import SwiftUI
import WebKit

@MainActor
final class SidebarModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var briefs: [String: SessionBrief] = [:] {
        didSet { reviveRunning() }
    }
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
    /// Chats deleted from the list (ChatTrash.swift): out of it, and in Settings' deleted chats for 30 days, where they
    /// can be put back; then their files are deleted from the Mac. Kept across launches.
    @Published var trash = ChatTrash.load() {
        didSet { ChatTrash.save(trash) }
    }
    /// Chats whose files are being deleted right now: out of the trash already, not back in the list.
    @Published private var erasing: Set<String> = []
    /// Chats picked (⌘-click; ⇧-click for all up to it) for deleting or archiving several at once.
    @Published var selectedChats: Set<String> = []
    /// The chat picked last: where a ⇧-click's run starts.
    private var lastPicked: String?
    /// Files of chats were deleted: the engine reads the list again.
    var onErased: (() -> Void)?

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
        selectedChats = []
        if selectedFolders.remove(cwd) == nil { selectedFolders.insert(cwd) }
    }

    func setSelectedFolders(archived on: Bool) {
        for cwd in selectedFolders { setFolder(cwd, archived: on) }
        selectedFolders = []
    }

    // MARK: picking chats

    /// The chats as the list shows them now, top to bottom (a folded folder's and those behind "+N more" aren't shown).
    private var shownChats: [ChatItem] {
        var out = sections.favorites
        for card in cards where !(folded.contains(Self.folderKey(card.cwd)) && query.isEmpty) {
            out += expanded.contains(card.cwd) || !query.isEmpty ? card.items : Array(card.items.prefix(5))
        }
        return out
    }

    /// The picked chats still in the list.
    var pickedChats: [ChatItem] { everything.filter { selectedChats.contains($0.id) } }

    /// ⌘-click, or a click while some are picked: this chat in or out of the picked ones.
    func pick(_ item: ChatItem) {
        selectedFolders = []
        if selectedChats.remove(item.id) == nil { selectedChats.insert(item.id) }
        lastPicked = item.id
    }

    /// ⇧-click: every chat shown from the one picked last to this one.
    func pick(upTo item: ChatItem) {
        let shown = shownChats.map(\.id)
        guard let from = lastPicked.flatMap({ shown.firstIndex(of: $0) }), let to = shown.firstIndex(of: item.id) else {
            if !selectedChats.contains(item.id) { pick(item) }
            return
        }
        selectedFolders = []
        selectedChats.formUnion(shown[min(from, to)...max(from, to)])
    }

    func clearPicked() {
        selectedChats = []
        selectedFolders = []
        lastPicked = nil
    }

    /// The picked chats into the archive.
    func archivePicked() {
        for item in pickedChats where !isArchived(item) { toggleArchived(item) }
        clearPicked()
    }

    /// The chats a folder's card shows (not its archived or starred ones), for deleting a whole folder's.
    func chats(inFolders cwds: Set<String>) -> [String] {
        let keys = Set(cwds.map(Self.folderKey))
        return cards.filter { keys.contains(Self.folderKey($0.cwd)) }.flatMap { $0.items.map(\.id) }
    }

    // MARK: deleting chats

    /// Whether a chat can be deleted here: a saved conversation of Claude Code's, Codex's or Antigravity's, not running
    /// (a running one is ended first).
    func canDelete(_ item: ChatItem) -> Bool {
        guard brief(for: item)?.live != true else { return false }
        switch item.tool {
        case "claude": return ChatTrash.isTranscript(item.path)
        case "codex": return ChatTrash.isCodexLog(item.path, id: item.id)
        case "antigravity": return ChatTrash.isSessionId(item.id)
        default: return false
        }
    }

    /// Of the chats named: those that can be deleted, how many can't because they run, and how many others can't.
    func deletable(_ ids: [String]) -> (chats: [ChatItem], running: Int, others: Int) {
        let wanted = Set(ids)
        var chats: [ChatItem] = [], running = 0, others = 0
        for item in everything where wanted.contains(item.id) {
            if canDelete(item) {
                chats.append(item)
            } else if brief(for: item)?.live == true {
                running += 1
            } else {
                others += 1
            }
        }
        return (chats, running, others)
    }

    /// Into the trash: out of the list (and the favorites), kept 30 days.
    func delete(_ chats: [ChatItem]) {
        let now = nowMs()
        var next = trash
        for item in chats where canDelete(item) {
            next[item.id] = TrashedChat(id: item.id, title: title(of: item), cwd: item.cwd, tool: item.tool, path: item.path, at: now)
        }
        favorites.subtract(chats.map(\.id))
        trash = next
        clearPicked()
    }

    /// Out of the trash, back where it was in the list.
    func putBack(_ id: String) { trash[id] = nil }

    func putBackAll() { trash = [:] }

    /// A deleted chat that runs again (continued in a terminal: `claude --resume`, `codex resume`, `agy --conversation`)
    /// comes back: it's in use.
    private func reviveRunning() {
        guard !trash.isEmpty else { return }
        for b in briefs.values where b.live {
            if trash[b.id] != nil { trash[b.id] = nil }
            if let conv = b.convId, trash[conv] != nil { trash[conv] = nil }
        }
    }

    /// Deleted from the disk, for good: these chats of the trash. Their names and marks here go with them. One that
    /// couldn't be deleted just now (its tool held its list) stays in the trash, to be tried again.
    func erase(_ ids: [String]) {
        let chats = ids.compactMap { trash[$0] }
        guard !chats.isEmpty else { return }
        let gone = Set(chats.map(\.id))
        erasing.formUnion(gone)
        trash = trash.filter { !gone.contains($0.key) }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            let failed = chats.filter { !ChatTrash.erase($0) }
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    self.erasing.subtract(gone)
                    for chat in failed where self.trash[chat.id] == nil { self.trash[chat.id] = chat }
                    let done = gone.subtracting(failed.map(\.id))
                    self.favorites.subtract(done)
                    self.archived.subtract(done)
                    self.restored.subtract(done)
                    self.customTitles = self.customTitles.filter { !done.contains($0.key) }
                    self.onErased?()
                }
            }
        }
    }

    /// The chats whose 30 days are over are deleted from the disk. One written to since it was deleted (continued while
    /// the app was closed) comes back instead.
    func emptyExpiredTrash() {
        let all = trash, now = nowMs()
        guard all.values.contains(where: { ChatTrash.expired($0, now: now) }) else { return }
        DispatchQueue.global(qos: .utility).async { [weak self] in
            let due = ChatTrash.due(all, now: now)
            DispatchQueue.main.async {
                MainActor.assumeIsolated {
                    guard let self else { return }
                    // Only what is still as it was read: one put back meanwhile stays.
                    for chat in due.putBack where self.trash[chat.id] == chat { self.trash[chat.id] = nil }
                    self.erase(due.erase.filter { self.trash[$0.id] == $0 }.map(\.id))
                }
            }
        }
    }

    /// For Settings (TrashBridge): the deleted chats by folder, the one deleted last first, each with the days it has left.
    func trashList() -> [[String: Any]] {
        let now = nowMs()
        var order: [String] = []
        var map: [String: [TrashedChat]] = [:]
        for chat in trash.values.sorted(by: { $0.at > $1.at }) {
            if map[chat.cwd] == nil { order.append(chat.cwd) }
            map[chat.cwd, default: []].append(chat)
        }
        let names = labels(for: order)
        return order.map { cwd in
            ["cwd": cwd, "label": names[cwd] ?? projectLabel(cwd),
             "chats": (map[cwd] ?? []).map {
                 ["id": $0.id, "title": $0.title, "tool": $0.tool, "days": ChatTrash.daysLeft($0.at, now: now)]
             }]
        }
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

    /// The live brief matching a chat row (either by session id for Claude, or by convId for Antigravity).
    func brief(for item: ChatItem) -> SessionBrief? {
        briefs[item.id] ?? briefs.values.first { $0.convId == item.id }
    }

    /// The saved chats in the list or its archive: not the deleted ones (Settings · deleted chats).
    var savedCount: Int { items.filter { trash[$0.id] == nil && !erasing.contains($0.id) }.count }

    /// Every chat, newest first; live sessions without a saved title too. The deleted ones aren't among them.
    private var everything: [ChatItem] {
        var all = items.filter { trash[$0.id] == nil && !erasing.contains($0.id) }
        let known = Set(items.map(\.id))
        for b in briefs.values where b.live && !known.contains(b.id) && (b.convId.map { !known.contains($0) } ?? true) && !b.cwd.isEmpty {
            let tool = b.name == "Antigravity" ? "antigravity" : b.name == "Codex" ? "codex" : "claude"
            all.append(ChatItem(id: b.id, path: "", cwd: b.cwd, mtime: Date().timeIntervalSince1970 * 1000, size: 0,
                                title: b.title.isEmpty ? "new chat · \(b.name)" : b.title, lastPrompt: "", tool: tool))
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
    /// Delete, for these chats: the app asks first, then they go to Settings' deleted chats for 30 days.
    let delete: ([String]) -> Void
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
                Text("\(model.savedCount) saved · \(model.briefs.values.filter(\.live).count) live")
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

            // Chats picked (⌘-click on them) or folders (on their headers): archive or delete them all at once.
            if !model.selectedFolders.isEmpty || !model.selectedChats.isEmpty {
                let folders = !model.selectedFolders.isEmpty
                HStack(spacing: 8) {
                    Text("\(folders ? model.selectedFolders.count : model.pickedChats.count) selected")
                        .font(.mono(10, .semibold))
                        .lineLimit(1)
                        .foregroundColor(Theme.cAccentSoft)
                    Spacer()
                    bulkButton("archive") {
                        withAnimation(.easeInOut(duration: 0.25)) {
                            if folders { model.setSelectedFolders(archived: true) } else { model.archivePicked() }
                        }
                    }
                    // The app asks first; what's deleted leaves the list then.
                    bulkButton("delete", danger: true) {
                        actions.delete(folders ? model.chats(inFolders: model.selectedFolders) : model.pickedChats.map(\.id))
                    }
                    Button {
                        model.clearPicked()
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
        let live = card.terms.contains(where: \.shown) || card.items.contains {
            model.openInTabs.contains($0.id) || (model.brief(for: $0).map { model.openInTabs.contains($0.id) } ?? false)
        }
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

    /// A button of the bar over the list while chats or folders are picked. `danger`: it deletes, so it isn't the filled
    /// one (the likely action is), only outlined in red.
    private func bulkButton(_ title: String, danger: Bool = false, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.mono(10, .semibold))
                .foregroundColor(danger ? Theme.cRed : Theme.cInk)
                .padding(.horizontal, 8)
                .frame(height: 18)
                .background(RoundedRectangle(cornerRadius: 3).fill(danger ? Color.clear : Theme.cAccent))
                .overlay(RoundedRectangle(cornerRadius: 3).stroke(danger ? Theme.cRed : Color.clear, lineWidth: 1))
                .contentShape(Rectangle())
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
                             // Its chats, or those of every folder picked with it.
                             onDelete: {
                                 let picked = model.selectedFolders.count > 1 && model.selectedFolders.contains(cwd)
                                 actions.delete(model.chats(inFolders: picked ? model.selectedFolders : [cwd]))
                             },
                             onSelect: { model.selectFolder(cwd) },
                             onFold: { withAnimation(.easeInOut(duration: 0.2)) { model.toggleFold(cwd) } },
                             onUnpin: { withAnimation(.easeInOut(duration: 0.25)) { model.unpin(cwd) } },
                             onReveal: { actions.reveal(cwd) },
                             onBulk: { on in withAnimation(.easeInOut(duration: 0.25)) { model.setSelectedFolders(archived: on) } })
    }

    private func row(_ item: ChatItem) -> some View {
        let favorite = model.favorites.contains(item.id), archived = model.isArchived(item)
        let b = model.brief(for: item)
        let inTab = model.openInTabs.contains(item.id) || (b.map { model.openInTabs.contains($0.id) } ?? false)
        let isActive = model.activeSessionId == item.id || (b != nil && model.activeSessionId == b?.id)
        let selected = model.selectedChats.contains(item.id)
        // With others picked too, its menu's Delete is for all of them.
        let picked = selected ? model.pickedChats.map(\.id) : []
        return ChatRow(item: item, title: model.title(of: item), renaming: model.renaming == item.id,
                       onRename: { name in
                           if let name { model.rename(item.id, to: name) } else { model.renaming = nil }
                       },
                       brief: b, inTab: inTab,
                       isActive: isActive, favorite: favorite,
                       archived: archived, selected: selected,
                       onStar: { withAnimation(.easeInOut(duration: 0.25)) { model.toggleFavorite(item) } },
                       onArchive: { withAnimation(.easeInOut(duration: 0.25)) { model.toggleArchived(item) } })
            .onTapGesture {
                // ⇧-click picks all up to it, ⌘-click picks it; while some are picked a click picks too, so one that
                // misses its key doesn't open a chat (and start Claude). Else a click opens it.
                let keys = NSEvent.modifierFlags
                if keys.contains(.shift) {
                    model.pick(upTo: item)
                } else if keys.contains(.command) || !model.selectedChats.isEmpty {
                    model.pick(item)
                } else {
                    actions.open(item.id)
                }
            }
            .contextMenu {
                Button("Rename…") { model.renaming = item.id }
                Button(favorite ? "Remove from Favorites" : "Add to Favorites") {
                    withAnimation(.easeInOut(duration: 0.25)) { model.toggleFavorite(item) }
                }
                Button(archived ? "Unarchive" : "Archive") {
                    withAnimation(.easeInOut(duration: 0.25)) { model.toggleArchived(item) }
                }
                Button(selected ? "Deselect" : "Select") { model.pick(item) }
                Divider()
                Button("Open in a Window") { actions.open(item.id) }
                if item.tool == "claude" {
                    Button("Open a Copy (fork)") { actions.fork(item.id) }
                }
                Button("New Terminal in This Folder") { actions.newTerminal(item.cwd) }
                Divider()
                Button("Show Folder in Finder") { actions.reveal(item.cwd) }
                Button("Copy Session ID") { actions.copyId(item.id) }
                Divider()
                Button(picked.count > 1 ? "Delete the \(picked.count) Selected Chats…" : "Delete…") {
                    actions.delete(picked.count > 1 ? picked : [item.id])
                }
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
    let onDelete: () -> Void
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
              : "\(tildify(cwd)) · click to fold \(shut ? "open" : "shut") · ⌘-click to select, for archiving or deleting several at once")
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
            Divider()
            Button(bulk > 1 && selected ? "Delete the Chats in the \(bulk) Selected Folders…" : "Delete the Chats in This Folder…",
                   action: onDelete)
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
    /// Picked (⌘-click) for deleting or archiving several at once: a tick in its light's place, and a brighter row.
    let selected: Bool
    let onStar: () -> Void
    let onArchive: () -> Void
    @State private var hover = false
    @State private var draft = ""
    @FocusState private var editing: Bool

    var body: some View {
        let live = brief?.live == true
        let status = live ? brief?.status : nil
        let isAgy = item.tool == "antigravity"
        HStack(spacing: 8) {
            StatusDot(status: status ?? "ended", size: 7, hollow: !live)
                .id(status ?? "ended")
                .opacity(selected ? 0 : 1)
                .overlay {
                    if selected {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 10)).foregroundColor(Theme.cAccent)
                    }
                }
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
                    HStack(spacing: 4) {
                        Text(title)
                            .font(.mono(11, isActive ? .semibold : .regular))
                            .foregroundColor(isActive || live ? Theme.cHi : Theme.cText)
                            .lineLimit(1)
                        if isAgy || item.tool == "codex" {
                            Text(isAgy ? "agy" : "codex")
                                .font(.mono(8, .medium))
                                .foregroundColor(Theme.cAccent.opacity(0.8))
                                .padding(.horizontal, 3)
                                .padding(.vertical, 1)
                                .background(RoundedRectangle(cornerRadius: 2).fill(Theme.cAccent.opacity(0.12)))
                        }
                    }
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
                .fill(selected ? Theme.cAccent.opacity(0.26)
                      : isActive ? Theme.cAccent.opacity(0.18) : (inTab ? Theme.cAccent.opacity(0.10) : (hover ? Theme.cAccent.opacity(0.06) : .clear)))
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

/// Settings' deleted chats (web/cloud.js): the chats deleted from the chats list, by folder, with the days each has
/// left of its 30; putting one or all back, and deleting one or all from the disk now (`confirm` asks first: that
/// can't be undone).
final class TrashBridge: NSObject, WKScriptMessageHandlerWithReply {
    private weak var model: SidebarModel?
    private let confirm: @MainActor (_ title: String, _ text: String) -> Bool

    init(model: SidebarModel, confirm: @escaping @MainActor (_ title: String, _ text: String) -> Bool) {
        self.model = model
        self.confirm = confirm
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage,
                               replyHandler: @escaping @MainActor @Sendable (Any?, String?) -> Void) {
        let body = message.body as? [String: Any] ?? [:]
        MainActor.assumeIsolated {
            guard let model else { return replyHandler(nil, "no chats list") }
            switch body["type"] as? String {
            case "list": model.emptyExpiredTrash()
            case "putBack": if let id = body["id"] as? String { model.putBack(id) }
            case "putBackAll": model.putBackAll()
            case "erase":
                if let id = body["id"] as? String, let chat = model.trash[id],
                   confirm("Delete “\(clip(chat.title.isEmpty ? "untitled" : chat.title, 60))” now?",
                           "It's deleted from this Mac for good. This can't be undone.") {
                    model.erase([id])
                }
            case "eraseAll":
                let n = model.trash.count
                if n > 0, confirm(n == 1 ? "Delete the chat now?" : "Delete all \(n) chats now?",
                                  "\(n == 1 ? "It's" : "They're") deleted from this Mac for good. This can't be undone.") {
                    model.erase(Array(model.trash.keys))
                }
            default: return replyHandler(nil, "unknown request")
            }
            replyHandler(["folders": model.trashList(), "days": Int(ChatTrash.keep / 86_400_000)], nil)
        }
    }
}
