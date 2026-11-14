import Foundation
import Security

/// Whether a process that looks like an AI tool runs that tool's own program, before its time goes to the tool's badge
/// (Activity.toolAtWork). The native Claude Code, Codex and Antigravity are signed by their makers (Developer ID, the
/// teams below), so another program renamed after one of them doesn't pass for it. A tool run as a script (Node, Bun,
/// Python: an npm install) can't be told apart this way and passes; Gemini CLI's own builds aren't signed, so it isn't
/// checked. The check reads the whole program once per file (in the background); until it's done the tool counts.
@MainActor
enum Vendor {
    private static let teams = ["claude": "Q6L2SF6YDW", "codex": "2DC432GLL2", "antigravity": "EQHXZ8M8AV"]
    private static let interpreters: Set<String> = ["node", "bun", "deno"]
    /// Program path (with the team asked for) → signed by that team.
    private static var known: [String: Bool] = [:]
    private static var checking: Set<String> = []

    static func genuine(_ tool: String, pid: Int32?) -> Bool {
        guard let team = teams[tool] else { return true }
        guard let pid, let path = Proc.path(pid) else { return false }
        let name = (path as NSString).lastPathComponent
        if interpreters.contains(name) || name.hasPrefix("python") { return true }
        let key = team + ":" + path
        if let ok = known[key] { return ok }
        if checking.insert(key).inserted {
            Task.detached(priority: .utility) {
                let ok = signed(path, by: team)
                await MainActor.run {
                    known[key] = ok
                    checking.remove(key)
                }
            }
        }
        return true
    }

    /// A whole, valid signature from an Apple-issued Developer ID certificate of `team`.
    nonisolated private static func signed(_ path: String, by team: String) -> Bool {
        var code: SecStaticCode?
        var requirement: SecRequirement?
        guard SecStaticCodeCreateWithPath(URL(fileURLWithPath: path) as CFURL, [], &code) == errSecSuccess, let code,
              SecRequirementCreateWithString("anchor apple generic and certificate leaf[subject.OU] = \"\(team)\"" as CFString, [], &requirement) == errSecSuccess,
              let requirement else { return false }
        return SecStaticCodeCheckValidity(code, SecCSFlags(rawValue: kSecCSCheckAllArchitectures), requirement) == errSecSuccess
    }
}
