# Atalay's Terminal for Windows

**Work in progress, not released yet.** It's built in the open, like the rest of the app: GitHub Actions builds an
installer for every push that touches it (the run's `atalay-terminal-windows` artifact), but there's no release and no
update channel for it yet.

The Windows app: Electron around the same dashboard the Mac app shows (`app/Resources/web`, used as it is), with
terminals from xterm.js and node-pty (ConPTY), the way VS Code runs its terminal on Windows. It talks to the same API
(friends, messages, levels, notifications) as the Mac app.

## Run and build

```sh
cd windows
npm install          # also builds node-pty for Electron (postinstall)
npm start            # the app, from the sources
npm run dist         # dist/Atalays-Terminal-Setup-<version>.exe (on Windows; GitHub Actions builds it on every push)
```

`ATALAY_API_URL=http://127.0.0.1:4800 npm start` runs it against a local API.

## How it's put together

The dashboard's pages call the app through `window.webkit.messageHandlers.<name>.postMessage(...)`, as WKWebView has it
on the Mac. `src/preload.js` gives them the same object over Electron's IPC, so the pages run unchanged; the app answers
in `src/main.js` and pushes to them with `window.__radar.*`, `window.__messages.*` as the Mac app does.

| File | What it does | From the Mac app |
|------|--------------|------------------|
| `src/main.js` | windows, IPC between pages and the parts below, keys | MainWindowController, AppDelegate |
| `src/preload.js` | `window.webkit.messageHandlers` over IPC, the values the Mac injects into pages | RadarView, Messages, Overlay |
| `src/engine.js` | Claude Code's sessions and transcripts (`%USERPROFILE%\.claude`) into the dashboard's state | Engine/*.swift |
| `src/terminals.js` | shells and Claude in ConPTY (node-pty), one per chat or terminal window | ChatTerminal, Detached |
| `src/git.js` | Source Control's requests: the repos, diffs, history, commit, push | Git.swift |
| `src/cloud.js` | the API: hacker name, heartbeat (XP), friends and messages, the live socket, notifications | Cloud, Social, ClientKey |
| `src/themes.js` | the themes: every colour token from a palette, into each page | Themes.swift |
| `src/overlay.js` | the shortcut wheel's and the folder picker's folders (overlay.html) | Overlay.swift |
| `pages/terminal.*` | a chat or terminal window: xterm.js and its header | ChatWindow |

## Not like the Mac app (yet)

- Chats live as long as the app: Windows has no `screen`, so a session host that keeps them running after the app quits
  comes later.
- No three-finger click (Mac trackpads only): Ctrl+K opens the shortcut wheel.
- No iTerm2: a chat started in another terminal shows on the dashboard and can be opened as a copy.
- Updates come from GitHub releases (electron-updater), not from the API's offer, which is the Mac app's.
