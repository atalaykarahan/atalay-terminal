# Atalay's Terminal for Windows

**Out as a pre-release**: [the releases repo's windows release](https://github.com/atalaykarahan/atalay-terminal-releases/releases/tag/windows).
It's built in the open, like the rest of the app, but its installers are built and published on the Windows PC, not on
GitHub's machines, since they carry the app's API key (below).

The Windows app: Electron around the same dashboard the Mac app shows (`app/Resources/web`, used as it is), with
terminals from xterm.js and node-pty (ConPTY), the way VS Code runs its terminal on Windows. It talks to the same API
(friends, messages, levels, notifications) as the Mac app.

## Run and build

```sh
cd windows
npm install          # node-pty comes prebuilt (N-API, loads in Electron as it is): nothing to compile
npm start            # the app, from the sources
npm run staging      # the same against the local API, never the live one (below)
npm run dist         # dist/Atalays-Terminal-Setup-<version>.exe (on Windows)
npm run release -- "what changed"     # a signed build, published as the update every installed copy takes
```

`npm run staging` is for trying things without touching real users' data, as the Mac's `dev.sh` and staging build
are: the private API repo cloned as `api/` next to `app/` and `windows/` (gitignored there), running in Docker
(`docker compose up -d` in `api/`, with an `ADMIN_TOKEN` of its own in `api/.env`). It registers a key of its own with
that API (`~/.atalay-terminal/client-key-windows-staging`, so the release key in `src/clientkey.js` is never swapped)
and keeps its own profile, so it runs next to the installed app.

The app's API calls are signed with a key of its own (the API refuses unsigned ones). The key never goes to GitHub: it
lives in `~/.atalay-terminal/client-key-windows` on the Mac (`scripts/new-key.sh` makes a fresh one before a release;
the old one is revoked a month later) and is copied by hand to the Windows PC, which keeps it like an SSH key in
`~/.atalay-terminal/client-key-windows` (readable by its user only). `node scripts/clientkey.js` writes it from there
(or from `$env:ATALAY_CLIENT_KEY`), masked, into the gitignored `src/clientkey.js`; then `npm start` and `npm run dist`
there are signed. The packaged app can't be run as plain Node, inspected or edited (Electron fuses).

### Releases and updates

Installed copies look for updates every minute (and on waking or unlocking the PC), as the Mac's heartbeat does, in the
`windows` release of [atalay-terminal-releases](https://github.com/atalaykarahan/atalay-terminal-releases)
(electron-updater; package.json's `publish`): they read its latest.yml (about 1 KB) with a time limit and hand over to
electron-updater only when it names a newer version, so a release shows within a minute of going out. It's a pre-release, so it never becomes the repo's latest, the Mac's `.dmg` link keeps working, and a newer
Mac release can't hide the Windows files. An update downloads by itself and goes in when the app quits, or right away
when nothing would be stopped by a restart and the PC has been left alone for 10 minutes (or "right away" is on in
Settings). New users download `Atalays-Terminal-Setup.exe` from that release; it's always the newest.

A release, on the Windows PC:

1. On the Mac, `windows/scripts/new-key.sh`: a fresh key for this release (the old one stops working a month later, by
   when every running copy has updated). Copy it, then here, without it ever showing:
   `$env:ATALAY_CLIENT_KEY = (Get-Clipboard -Raw).Trim(); node scripts/clientkey.js --save; Remove-Item Env:ATALAY_CLIENT_KEY`
2. Raise `version` in package.json to the next version, the one the Mac's next release takes too: the two apps are one
   product with one version number (0.13.0 is the first they share), so the admin page compares them alike.
3. `npm run release -- "what changed" "what else"`: writes the key in, builds, and replaces the release's files
   (`latest.yml`, the installer and its blockmap; `--dry-run` only shows them). It signs in to GitHub as git does on
   this PC (or with `$env:GH_TOKEN`).

## How it's put together

The dashboard's pages call the app through `window.webkit.messageHandlers.<name>.postMessage(...)`, as WKWebView has it
on the Mac. `src/preload.js` gives them the same object over Electron's IPC, so the pages run unchanged; the app answers
in `src/main.js` and pushes to them with `window.__radar.*`, `window.__messages.*` as the Mac app does.

| File | What it does | From the Mac app |
|------|--------------|------------------|
| `src/main.js` | windows, IPC between pages and the parts below, keys | MainWindowController, AppDelegate |
| `src/preload.js` | `window.webkit.messageHandlers` over IPC, the values the Mac injects into pages | RadarView, Messages, Overlay |
| `src/engine.js` | Claude Code's sessions and transcripts (`%USERPROFILE%\.claude`) into the dashboard's state, and what the other AI tools do from their own records (Codex's logs, Antigravity's databases through `node:sqlite`), counted with Claude's; while a Codex runs, its account limits from `codex app-server` | Engine/*.swift |
| `src/ledger.js` | spend.ledger's history: each past day's spend by project and model, read once from the transcripts and kept in `%LOCALAPPDATA%\atalay-terminal\ledger.json` (Claude Code deletes transcripts after 30 days) | Ledger.swift |
| `src/terminals.js` | shells and Claude in ConPTY, one per chat or terminal window, in the session host | ChatTerminal, Detached |
| `src/host.cs`, `src/sessionhost.js` | the session host, which keeps them running without the app, and the app's line to it | Detached (screen) |
| `src/git.js` | Source Control's requests: the repos, diffs, history, commit, push | Git.swift |
| `src/cloud.js` | the API: hacker name, heartbeat (XP, the AI tools at work for their badges), friends and messages, the Roadmap, the account (signing out and deleting it keep the token here), the live socket, notifications | Cloud, Social, ClientKey |
| `src/files.js` | Source Control's editor's files: a text file Ctrl-clicked in a terminal opens there (the path worked out from the shell's folder, a path Claude wrapped joined again), read and written only once opened; anything else in its app, a program only shown in its folder | FileEditor.swift, ChatTerminal |
| `src/power.js` | power save: the map's switch, on by itself below 20% on battery or in Energy Saver (read with the process list) | PowerSaver.swift |
| `src/themes.js` | the themes: every colour token from a palette, into each page; Settings' interface font and text size | Themes.swift |
| `src/aicolors.js` | the AI tools in the theme's colours: Claude Code, Codex and Antigravity on their themes that use the terminal's 16 colours, each one's own given back when it's turned off | AIColors.swift |
| `src/runaways.js` | the process list: what burns a core where nobody sees it (DANGER), what closed terminals left running (amber cars), what runs in the app's terminals (their cars), the AI tools besides Claude running in a terminal (Codex, Gemini…: planets) | Runaways, MainWindowController, RadarEngine |
| `src/savers.js` | the token savers, rtk and caveman, on for Claude Code, Codex and Antigravity (`scripts/fetch-rtk.js` gets rtk for the build), and the agent token rules, off until turned on (`npm test` runs `src/savers.test.js`) | TokenSavers |
| `src/limits.js` | Claude's 5-hour and weekly limits for the top bar: a script of the app's as Claude Code's status line, a status line of the user's own run through it | Limits |
| `src/overlay.js` | the shortcut wheel's and the folder picker's folders (overlay.html) | Overlay.swift |
| `src/chatlist.js`, `pages/chats.*` | the chats list beside the dashboard (a view of its own in the dashboard window): every saved chat by project, each folder a card with the app's terminals in it, folders opened from the list, favourites, the archive (Settings lists it) | Sidebar.swift |
| `pages/terminal.*` | a chat or terminal window: xterm.js and its header | ChatWindow |

### The session host

Windows has no `screen`, so the app brings its own: `src/host.cs`, compiled at first use by the C# compiler that comes
with Windows (.NET Framework's `csc.exe`) into `%LOCALAPPDATA%\atalay-terminal-host`. Every chat and terminal runs in a
pseudo console it holds, so the app can quit, update or crash and Claude keeps working; at the next launch the windows
attach again (hidden, as on the Mac: a click on the dashboard opens one), starting from the end of the output the host
kept. It runs outside the app's folder because an update's installer ends everything that runs from there; it ends by
itself once its last session has and no app is connected, and uninstalling ends it (`build/installer.nsh`). The
installed app and a development run (`npm start`) each have their own. Without it (it couldn't be built or started) the
chats run in the app, through node-pty, and end with it.

## Not like the Mac app (yet)

- Closing the dashboard keeps the app going while a chat or terminal runs (starting the app again brings it back, as
  the Dock does on the Mac); with none, it quits.
- No tabs or split panes: every terminal is a window of its own. Closing one (Ctrl+W, its ×) keeps it running as a car
  on the orbit, as a closed tab does on the Mac; a click opens it again, End Session ends it and all it runs.
- No four-finger click (Mac trackpads only): Ctrl and the middle mouse button (or Ctrl+K) open the shortcut wheel,
  Ctrl+N a new file in Source Control's editor, Ctrl+Shift+N a new terminal and Ctrl+W closes the window, in the
  terminal windows too (where they'd otherwise go to the shell); Ctrl++ and Ctrl+- there are the terminals' text size,
  as ⌘+ and ⌘− on the Mac. While Antigravity runs in one, its Ctrl+K is Antigravity's, which approves its subagents'
  steps with it.
  Ctrl+B (⌘B) opens and closes the chats list in the dashboard window only: in a terminal it stays the shell's (and
  Claude's, which runs a command in the background with it).
- No iTerm2: a chat started in another terminal shows on the dashboard and can be opened as a copy.
- Updates come from the releases repo's `windows` release (above), not from the API's offer, which is the Mac app's.
