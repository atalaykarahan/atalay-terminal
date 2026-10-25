import SwiftUI

@MainActor
final class SidebarModel: ObservableObject {
    @Published var items: [ChatItem] = []
    @Published var briefs: [String: SessionBrief] = [:]
    @Published var openInTabs: Set<String> = []
    @Published var query = ""
    @Published var expanded: Set<String> = []

    /// Projects ordered by their most recent chat; live sessions without a saved title still show up.
    var groups: [(cwd: String, items: [ChatItem])] {
        var all = items
        let known = Set(items.map(\.id))
        for b in briefs.values where b.live && !known.contains(b.id) && !b.cwd.isEmpty {
            all.append(ChatItem(id: b.id, path: "", cwd: b.cwd, mtime: Date().timeIntervalSince1970 * 1000, size: 0,
                                title: b.title.isEmpty ? "new chat · \(b.name)" : b.title, lastPrompt: ""))
        }
        all.sort { $0.mtime > $1.mtime }
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if !q.isEmpty {
            all = all.filter { "\($0.title) \($0.lastPrompt) \($0.cwd)".lowercased().contains(q) }
        }
        var order: [String] = []
        var map: [String: [ChatItem]] = [:]
        for it in all {
            if map[it.cwd] == nil { order.append(it.cwd) }
            map[it.cwd, default: []].append(it)
        }
        return order.map { ($0, map[$0]!) }
    }

    /// Shortest path suffix that tells projects apart: "05_AI" twice becomes "0019_F1Reels/…/05_AI" and "0020_SecondReels/…/05_AI".
    func labels(for cwds: [String]) -> [String: String] {
        let parts = Dictionary(cwds.map { ($0, tildify($0).split(separator: "/").map(String.init)) }, uniquingKeysWith: { a, _ in a })
        var out: [String: String] = [:]
        var pending = Set(cwds)
        var k = 2
        while !pending.isEmpty {
            var seen: [String: [String]] = [:]
            for cwd in pending {
                let p = parts[cwd] ?? []
                let tail = Array(p.suffix(k))
                let label = tail.count <= 2 ? tail.joined(separator: "/") : "\(tail[0])/…/\(tail[tail.count - 1])"
                seen[label, default: []].append(cwd)
            }
            for (label, owners) in seen where owners.count == 1 || owners.allSatisfy({ (parts[$0]?.count ?? 0) <= k }) {
                for cwd in owners { out[cwd] = owners.count == 1 ? label : tildify(cwd) }
                pending.subtract(owners)
            }
            k += 1
        }
        return out
    }
}

struct SidebarActions {
    let open: (String) -> Void
    let fork: (String) -> Void
    let newTerminal: (String) -> Void
    let reveal: (String) -> Void
    let copyId: (String) -> Void
}

struct SidebarView: View {
    @ObservedObject var model: SidebarModel
    let actions: SidebarActions

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                Text("chats")
                    .font(.mono(10.5, .bold))
                    .foregroundColor(Color(hex: 0x1A0D00))
                    .padding(.horizontal, 8)
                    .frame(height: 19)
                    .background(Theme.cAccent)
                Text("\(model.items.count) saved · \(model.briefs.values.filter(\.live).count) live")
                    .font(.mono(9.5))
                    .foregroundColor(Theme.cDim)
                Spacer()
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

            ScrollView {
                let groups = model.groups
                let labels = model.labels(for: groups.map(\.cwd))
                LazyVStack(alignment: .leading, spacing: 1) {
                    ForEach(groups, id: \.cwd) { group in
                        ProjectHeader(cwd: group.cwd, label: labels[group.cwd] ?? projectLabel(group.cwd), count: group.items.count,
                                      onNew: { actions.newTerminal(group.cwd) })
                        let expanded = model.expanded.contains(group.cwd) || !model.query.isEmpty
                        ForEach(expanded ? group.items : Array(group.items.prefix(5))) { item in
                            ChatRow(item: item, brief: model.briefs[item.id], inTab: model.openInTabs.contains(item.id))
                                .onTapGesture { actions.open(item.id) }
                                .contextMenu {
                                    Button("Open in a Window") { actions.open(item.id) }
                                    Button("Open a Copy (fork)") { actions.fork(item.id) }
                                    Button("New Terminal in This Folder") { actions.newTerminal(item.cwd) }
                                    Divider()
                                    Button("Show Folder in Finder") { actions.reveal(item.cwd) }
                                    Button("Copy Session ID") { actions.copyId(item.id) }
                                }
                        }
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
    }
}

private struct ProjectHeader: View {
    let cwd: String
    let label: String
    let count: Int
    let onNew: () -> Void
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
        .help(tildify(cwd))
        .onHover { hover = $0 }
    }
}

private struct ChatRow: View {
    let item: ChatItem
    let brief: SessionBrief?
    let inTab: Bool
    @State private var hover = false

    var body: some View {
        let live = brief?.live == true
        let status = live ? brief?.status : nil
        HStack(spacing: 8) {
            StatusDot(status: status ?? "ended", size: 7, hollow: !live)
                .id(status ?? "ended")
            VStack(alignment: .leading, spacing: 1) {
                Text(item.title.isEmpty ? item.lastPrompt : item.title)
                    .font(.mono(11))
                    .foregroundColor(live ? Theme.cHi : Theme.cText)
                    .lineLimit(1)
                Text(meta(live: live, status: status))
                    .font(.mono(9))
                    .foregroundColor(status == "waiting" ? Theme.cAlert : Theme.cDim)
                    .lineLimit(1)
            }
            Spacer(minLength: 0)
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
        .help(item.lastPrompt.isEmpty ? item.title : item.lastPrompt)
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
