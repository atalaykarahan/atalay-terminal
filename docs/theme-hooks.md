# Theme hooks

A theme can do more than colours: its own CSS (linked from `index.html`, `messages.html` and `overlay.html`, as
`themes/mur47.css` is) can follow what the app is doing. `app/Resources/web/hooks.js` puts it on the page's `<html>`:

- **states** as `data-*` attributes, a number also as a CSS variable;
- **moments** as an attribute that stays for a moment (an animation keyed on it starts over when it comes again) and an
  event on `window`;
- the theme's own **sounds** and **terminal cursor**, as `ui` tokens in `themes.json`.

Nothing in the app's own look or sounds uses them, so a theme that doesn't ask sees and hears no difference. The
dashboard (`index.html`), the notices panel (`messages.html`) and the overlay (`overlay.html`) are separate pages, each
with its own attributes: the table says which page has which. The web pages are the same on Windows.

## Gate everything on your theme

Set `"--theme-id": "<id>"` in your theme's `ui`; the page gets it as `data-theme` too. Put every rule in
`@container style(--theme-id: <id>)`, so the other themes stay as they were. A container query never styles the root
itself, so select something inside it:

```css
@container style(--theme-id: my-theme) {
  :root[data-streak] #top { box-shadow: inset 0 -2px 0 var(--accent); }
}
```

`::before` and `::after` rules go under a named container on the root: WebKit kept the theme before's pseudo-elements on
screen after a switch under an unnamed one (the app now refreshes them, `__theme` in `Themes.swift`, but this works on
older versions too). Name it after your pack: `<html>` takes one `container-name`. A named query is matched against
`<html>`, so it doesn't see `#mapwrap { --theme-id: none }` (the orbit map's own look).

```css
html { container-name: my-pack; }
@container my-pack style(--theme-id: my-theme) {
  :root[data-streak-milestone] #top::after { counter-reset: run var(--streak); content: "STREAK " counter(run); }
}
```

## States

| Attribute | CSS variable | Page | What |
|---|---|---|---|
| `data-theme` | | all | the theme's `--theme-id` (none when it sets none) |
| `data-streak` | `--streak` | dashboard | tool results in a row that went well; 0 removes it |
| `data-idle` | | dashboard | no input on the computer for `1m`, `5m` or `10m` (none under a minute) |
| `data-same-file` | `--same-file` | dashboard, notices | how many files two chats are writing at once |
| `data-waiting` | `--waiting` | dashboard | sessions that need you |
| `data-working` | `--working` | dashboard | sessions at work |
| `data-level` | `--level` | notices | your level |
| `data-rank` | | notices | your rank's name (`Genin`, `ANBU`…) |

```css
@container style(--theme-id: my-theme) {
  :root[data-idle="10m"] #app { filter: grayscale(1); }
  :root[data-waiting] .brand { outline: 1px solid var(--warn); }
  #ticker { border-top: min(calc(var(--streak, 0) * 1px), 6px) solid var(--accent); }
}
```

## Moments

| Attribute and event | Value | Page | When |
|---|---|---|---|
| `data-streak-milestone`, `atalay:streak-milestone` | the run | dashboard | the run reaches 3, 5, 7, 10, 15, 25, 50 or 100 (3 s) |
| `data-streak-break`, `atalay:streak-break` | the run it ended | dashboard | a failed result ends a run of 3 or more |
| `data-back`, `atalay:back` | `1m`, `5m` or `10m` | dashboard | input again after a minute or more |
| `data-clash`, `atalay:clash` | the file's name | dashboard, notices | two chats begin writing the same file |
| `data-session-status`, `atalay:session-status` | `waiting` or `idle` | dashboard | a session needs you, or it's your turn |
| `data-theme-kept`, `atalay:theme-kept` | the theme's id | dashboard | a theme is kept (clicked, ↩, "use this theme"), not only pointed at (1.5 s) |
| `data-levelup`, `atalay:levelup` | the new level | notices | a new level or rank, as its takeover starts |
| `data-badge-reveal`, `atalay:badge-reveal` | the badge's id | notices | a new badge's reveal starts (one for each of several) |

The attribute stays 1.6 s unless the table says otherwise. The event's `detail` has the value and a little more
(`atalay:clash`: `path`, `chats`; `atalay:session-status`: `sid`; `atalay:levelup`: `from`, `rankUp`;
`atalay:badge-reveal`: `tier`, `n`, `of`).

```css
@keyframes my-intro { from { opacity: 0; transform: scale(1.04); } }
@container style(--theme-id: my-theme) {
  :root[data-theme-kept] #app { animation: my-intro 0.9s ease-out; }
  :root[data-clash] #p-files { outline: 1px solid var(--warn); }
}
```

## Sounds

A `ui` token `--sfx-<name>` replaces the app's sound of that name: `none` silences it, a path from
`app/Resources/web` plays that file. Quote the path; only letters, digits, `_ - . /` and spaces, no `..`, no address
elsewhere and no `url()`. Anything else plays the app's own sound.

- Notices and dashboard (`Sfx`): `wait`, `clash` (two chats on one file; else as `wait`), `message`, `request`,
  `friend`, `online`, `accept`, `decline`, `send`, `xp`, `levelup`, `rankup`, `glitch`, `fire`, `alarm`, `hit`, `boom`.
- The dashboard's sound button: `ping-waiting`, `ping-idle`.
- Recorded (`sounds/`): `badge-impact`, `badge-shine` (a badge's reveal) and `badge-equip` (a badge put on display).
  The reveal starts each one so that its moment falls when the badge shows: put yours at the same point in the file
  (1.62 s, 1.07 s and 0.36 s in).
- The theme's alone, with the dashboard's moments: `streak` (a streak milestone), `streak-break`, `back` and
  `theme-kept`. The app has no sound for these, so they play only when the theme gives a file.

Do not disturb (for `Sfx`) and the dashboard's sound button (for its pings) still decide whether a sound plays at all.

```json
"ui": { "--theme-id": "my-theme", "--sfx-message": "\"themes/my-pack/sfx/message.wav\"", "--sfx-send": "none",
        "--sfx-streak": "\"themes/my-pack/sfx/streak.wav\"" }
```

## Terminal cursor

`--cursor-style` (`block`, `bar` or `underline`) and `--cursor-blink` (`1` or `0`) in `ui` set the terminals' cursor,
live as the theme changes. A theme that sets neither leaves it as the user's iTerm2 profile has it (on Windows, a
blinking block).

```json
"ui": { "--theme-id": "my-theme", "--cursor-style": "bar", "--cursor-blink": "0" }
```

## Scripts

The events above are on `window`; `atalay:state` (`detail: {name, value}`) tells when a state changes, and
`themechange` carries the theme's id (`detail: {id}`, on the Mac). `atalay:levelup` can be cancelled
(`preventDefault()`): the app then leaves its own takeover out, for a theme that plays its own; badges the level
brought are still revealed after it.
