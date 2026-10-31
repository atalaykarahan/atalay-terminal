<p align="center">
  <img src="https://raw.githubusercontent.com/atalaykarahan/atalay-terminal-releases/main/assets/icon.png" width="140" alt="Atalay's Terminal">
</p>

<h1 align="center">Atalay's Terminal</h1>

<p align="center">
  A HUD for running many Claude Code sessions on a Mac: every session on a live orbit map, each chat in its own
  window that keeps running in the background, terminals as flying cars, and friends with messages and levels.
</p>

<p align="center">
  <a href="https://github.com/atalaykarahan/atalay-terminal-releases/releases/latest/download/Atalays-Terminal.dmg"><b>⬇&nbsp; Download for macOS</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/atalaykarahan/atalay-terminal-releases">Install notes and screenshots</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/atalaykarahan/atalay-terminal-releases/main/assets/preview.gif" width="900" alt="Claude Code sessions orbiting live, with their subagents, tool calls, files, web research and spend">
</p>

## What it does

- **Every Claude Code session on one screen.** Busy, waiting for you and asking for approval each have their colour;
  subagents, tool calls, the files they touch, web research, tokens and spend (at API list prices) update live.
- **Each chat in its own window**, running in a detached session: close the window or quit the app and Claude keeps
  working; the window comes back with its history.
- **Terminals** for dev servers and tests fly around the orbit as cars and park when they're idle.
- **Friends**: add people by `name#tag`, message them, see who's online.
- **Levels**: the time you actively work earns XP, ranks go from Academy Student to Kage, and a leaderboard shows the
  week.

macOS 13 or later, Apple Silicon and Intel. Works with Claude Code; not affiliated with Anthropic.

## Privacy

- The dashboard reads Claude Code's own files on your Mac (`~/.claude`: the session list and transcripts), read only.
  None of it leaves your Mac: no prompts, no code, no transcripts, no file names, no token counts.
- The app talks to its server only for the social parts, feedback and updates: your hacker name and tag, the app and
  macOS version, whether you're working each minute (for XP) and your time zone, your friends, requests, messages and
  status, the leaderboard, and the feedback you send (kept with your name#tag and the time, no e-mail).
- Your Mac is known to the server by a salted hash of its hardware UUID (never the UUID itself) and a random token
  kept on the Mac.
- Messages are stored on the server so they reach your friends; they aren't end-to-end encrypted.
- Settings can hide your active time from friends and your name on the leaderboard.
- No analytics or tracking libraries. Updates come from this project's GitHub releases and are signed; the app checks
  the signature before installing.

## How it works

- `app/` is the Mac app: Swift (SwiftPM), AppKit and [SwiftTerm](https://github.com/migueldeicaza/SwiftTerm). Every
  chat and terminal runs in a detached `/usr/bin/screen` session, which is why they survive the app quitting.
- The dashboard is a web page in a `WKWebView` (`app/Resources/web`), the orbit map is three.js.
- `staging/` is where the dashboard is developed: the same page in a browser, with a small Node server that reads
  `~/.claude` the way the app does.
- The server behind friends, messages and levels (Fastify and Postgres) is hosted and isn't part of this repository.

## Build from source

Needs Xcode or the Command Line Tools (Swift 5.9+).

```sh
cd app
./build-app.sh --open      # builds "build/Atalay's Terminal.app" and opens it
```

A build from source has everything that runs on your Mac. Friends, messages and levels need the released app: its
calls to the server are signed with a key that isn't in this repository.

The dashboard in a browser, while working on it:

```sh
cd staging
npm install
npm run build              # the orbit map (src/orbit → public/orbit.js)
node server.mjs            # http://127.0.0.1:4790
```

## License

MIT
