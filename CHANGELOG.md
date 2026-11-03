# Changelog

Each version's lines are its release notes: the app lists them on its "what's new" screen
(`app/scripts/release.sh <version> "<one line per change>"`).

## 0.16.0

- Tabs: End Session in a window with tabs ends only the tab in front (its chat, its terminal or its panes), the other tabs keep running; the last one ends the window as before, and asks first when something still runs in it
- Chat list: right-click a chat to rename it (↩ keeps the new name, Esc leaves it, an empty name brings back the original); its star and archive are in the same menu
- Themes: Cyberpunk (neon yellow, cyan and magenta on black, its text in neon cyan)
- Themes: MUR47, by Mur-47: gunmetal with an emerald accent, walnut panel headers and chat strip, a brushed-steel top bar, stencil lettering, crosshair panel corners, a faint 47 stamp in a scope reticle and a crosshair mouse cursor; the chat windows' header on the Mac and Windows too
- Themes: the AI tools draw in the theme's colours (Settings · INTERFACE, on from the start): Claude Code, Codex and Antigravity on their own themes that use the terminal's 16 colours, so a theme recolours their text and highlights too, as iTerm2's do; turned off, each gets back the theme it had
- Updates: a bar shows how far the download has come, in the update window, on its button and in Settings ("updating 42%"), on the Mac and Windows
- Settings · INTERFACE: the font (mono, system, rounded) and the text size (100% to 140%), for text that's hard to read
- Orbit: a terminal's car ended with End Session stays gone (it blew up, then came back)
- Context: the gauge follows /autocompact within seconds (it kept the model's 1M until Claude's next reply)
- Token savers: the switches work for an rtk or caveman you set up yourself too (off takes it out of Claude Code's and Codex's settings, on puts it back as it was), and the app keeps them current: an rtk older than the app's is replaced by the app's where it lies (not one Homebrew keeps), and Claude Code updates the caveman plugin by itself (auto-update on for its marketplace)
- Orbit: Codex shows as working while its own program works (npm's Codex launcher only waits on it), and End Session on another AI tool outside the app ends all it started, as on Windows
- Orbit: the other AI tools show what they do: the command they have a shell run, and for Codex its turn from its own log (working, waiting for your approval, your turn), what you asked it and how full its context is; a click on one running outside the app brings its terminal forward (iTerm2's session or Terminal's tab; on Windows its window)
- Orbit: Antigravity's planet says what it does from Antigravity's own records: working only once you've sent it something (typing no longer counts), waiting for your approval, your turn, with its conversation's title and your message
- Orbit: Antigravity's subagents show as Claude's do, as workers of its planet with their role and the tool each is on, and the planet works while any of them does; one waiting for your approval (its command) makes the planet wait. Its web and browser tools show as web and browser, its file reads, searches and edits as theirs
- Leaderboard: THIS WEEK counts from Monday (each player's own), as the weekly goal does, not the last 7 days; the time beside a name too

## 0.15.3

- Orbit: Codex, Antigravity (agy), Gemini, OpenCode, Aider, Cursor's agent, Copilot and the other AI coding tools are planets of their own when they run in a terminal, as Claude Code is: on their orbit while they work, parked while they wait for you; a click opens the tab they run in

## 0.15.2

- Friends: a chat opens whole on the screen you're using (the dashboard's), not out of sight: with more than one display it could open where it was left on another one, behind a full-screen dashboard, or grow past the bottom of the screen; dragged off the edge, or a display unplugged, it comes back into view

## 0.15.1 (Windows only)

- Updates: a new version shows within a minute of going out (it was looked for every 30 minutes, so one could wait half an hour unseen), also right after the PC wakes or unlocks; a look that hangs on the network no longer holds up the ones after it

## 0.15.0

- Chat list: star a chat and it stays at the top (FAVORITES); archive one, a whole folder, or several folders picked with a click, and they leave the list altogether, and Settings doesn't show them either: its "archived chats · manage" button opens them in a window of their own, as in Claude and ChatGPT, where a chat, a folder or all of them come back (so a stream shows only what's meant to be seen)
- Chat list: open from the start (⌘B or the × in its corner closes it), sliding open and shut slowly with a fade at the width it had

## 0.14.0

- Friends: "is now online" notices are back, as on Steam: a friend who comes online after ten minutes or more away (a dropped connection, a restart for an update or a short sleep doesn't say it again)
- Leaderboard: a green dot by everyone at work right now (the last three minutes) and how many are at the top, so nobody works alone; never for someone invisible or who keeps their active time to themselves
- Token savers: rtk (shorter command output) and caveman (short answers) ship in the app and are on from the first launch for Claude Code and Codex, with no question; Settings has a switch for each (one you set up yourself stays yours)
- Tabs: a tab or split pane closed with ⌘W or its × keeps running, as a closed window does: it stays a car on the orbit (the same one, no blast) and a click opens it in a window of its own (⇧⌘T puts it back in its tab); End Session ends the window and all of them, and whatever shrugs off the hangup (a dev server holding its port) is ended too
- Chats: the windows are see-through again, plainly and without the frost, 90% opaque, header and terminals alike (they had turned solid with the themes)

## 0.13.1 (Windows only)

- Updates: "update now" pressed while the new version is still downloading installs it as soon as the download ends (it stayed on "downloading…" with no way out); a failed download or installer start says so and gives the button back

## 0.13.0

- Shortcuts: change any of the app's keyboard shortcuts in the main menu's new SHORTCUTS tab: click one and press the new keys (↺ brings it back); on top, the shortcut wheel's card: the four-finger click, and a second way you set, keys or a mouse button with ⌃ ⌥ ⇧ ⌘
- Windows: Ctrl and the middle mouse button open the shortcut wheel (Ctrl+K still does)
- Tabs: a long chat name no longer stretches its tab (and the window) across the screen: it's cut short with …, every tab the same width; a mirror (a chat the other app runs) gets ⌘T tabs and ⌘D splits too
- Orbit: every plain tab and split pane is a car of its own (Claude in one is a session), and a click opens that very pane, its tab in front; what a closed terminal left running (a dev server still holding its port) flies as an amber car, and a click ends it
- Chats: a copy button at the top right (and ⇧⌘C) copies Claude's last reply, all of it, even what doesn't fit the window: Claude's full-screen view only lets the terminal select what's on screen
- Terminals work as iTerm2 does: ⌘F finds (⌘G, ⇧⌘G, ⌘E), ⌘K clears the buffer, ⌘↑ ⌘↓ ⌘⇞ ⌘⇟ ⌘↖ ⌘↘ move through the history (in Claude's full-screen view too), ⌥-drag selects on the terminal, a right-click menu (copy, paste, find, clear, split), ⌘↩ full screen; the shortcut wheel opens with the four-finger click and with ⌃ and the middle mouse button (changeable in SHORTCUTS), no longer with ⌘K
- Chats: select with the mouse as in iTerm2: in Claude's full-screen view a drag goes to Claude, which selects across the whole conversation, scrolling when you hold the drag past the top or the bottom (faster the farther), the selection staying on the text, and ⌘C copies it; Shift-drag selects on the terminal itself
- Friends and the leaderboard: the flames burn on 5 hours of work today, counted from midnight as a daily stat, no longer on 5 in the last 24 hours
- Logo: it shows again at the top left and on the loading screen (it had vanished with the themes), always in its own orange whatever the theme
- Top left: no red count on the logo any more, unread messages and friend requests count on the friends icon on the left edge
- Limits: the 5-hour and weekly limits show for everyone, not only where the status line was set up by hand: the app hooks into Claude Code's status line itself (a status line of your own keeps working)
- Engine failure: a process left burning a CPU core where nobody sees it (its terminal closed, its parent gone) sets off a DANGER alarm with a sound, and a blue box on fire flies into the orbit (the camera follows it in); the panel says what it is and ends it in one click

## 0.12.1

- Chats: Claude Code from its native installer is recognised: the mouse wheel scrolls its history, a paste goes in whole (a picture too) and a running chat comes back as a chat after a restart or an update
- Chats: the end session, pin and dashboard buttons at the top right work at the first click
- Chats: a long or resumed conversation resumes in the folder it started in (it could open in the last folder it worked in)

## 0.12.0

- Notifications: news from the developer on the dashboard's left edge (the bell shows how many are unread); a new one shows in the corner at once, even with the app in the background
- Updates: a new version downloads by itself and installs when you step away for 10 minutes (or when you quit), your chats keep running; Settings has "check for updates", "update now" and "install updates right away"
- XP: a version a newer one replaced more than a day ago earns no XP until it updates; the update button says so
- Left edge: the friends icon no longer shows Source Control's count of changed files now and then
- Friends: no more "is now online" notices (they came again whenever a friend's connection dropped); answering a message from the corner box marks it read

## 0.11.0

- Terminals: Claude's output no longer stutters while it streams, each frame shows whole
- Tabs: drag one onto a pane to split it there (its left, right, top or bottom half), or along the tab bar to reorder; ⌥⇧⌘[ / ⌥⇧⌘] move the tab in front, as in iTerm2 (⌃⌘ and the arrows resize the split)
- Messages: the reply box at the bottom right stays while you're typing in it; your friend's newer message shows above your reply, other notices wait
- Messages: replying from the bottom-right box keeps you where you are, it no longer brings the app forward
- Messages: the notice at the bottom right has a button that opens the chat (⤢)
- Chats: ⌘W closes a friend's chat window (it no longer closes a terminal pane behind it)
- Shortcut wheel: the mouse's middle button opens it too, for people without a trackpad
- Context: the gauge shows the session's real limit, the auto-compact window when one is set (/autocompact)
- Top bar: the 5-hour and weekly limits stay hidden until there's data for them
- Friends and the leaderboard show the last 24 hours instead of "today", the same wherever someone lives (their today ended at their own midnight), and the fire burns on 5 hours in the last 24; their 7 days are named by their own dates
- Levels: no 10-hour limit a day any more; past 8 hours XP comes at half the rate
- Source Control, as in VS Code (its modern look and file icons): the branch icon on the dashboard's left edge (with how many files changed) lists every repo your Claude sessions and terminals work in, each with its commit message box, Commit (and Commit & Push, Commit & Sync), staged changes and changes, and the history graph with its branch, upstream and base; a file opens as VS Code shows it: its syntax colours (in the app's theme), wrapped lines, sticky scroll, the overview ruler of changes, colour swatches, GitLens's blame of the line clicked and the status bar. Files a Claude session edited carry a ✦ (⌃⇧G opens it)
- Themes: 12 colour themes on a screen of their own (the palette on the dashboard's left edge): the default orange, GitHub Dark, One Dark, Dracula, Monokai, Ayu Dark, Night Owl, Tokyo Night, Catppuccin Mocha, Gruvbox Dark, Nord and Solarized Dark. Pointing at one shows the whole app in it at once, a click keeps it: the dashboard, the menus, the terminals, Source Control and its code, the chat windows and message boxes. The orbit map keeps its own colours
- Leaderboard: on the dashboard's left edge (the trophy) instead of the main menu, the list and someone's card side by side; the card shows in their theme, and one click makes it yours
- Friends and messages: on the dashboard's left edge (the people, with how many messages and requests wait) instead of the main menu, friends beside requests
- Feedback: a glowing button at the foot of the dashboard's left edge instead of beside the main menu

## Next

- Terminals (important, reported 2026-11-03): resizing a window running `npm run dev` can blank the screen and lose its last lines. Cause (found 2026-11-04, reproduced headless with SwiftTerm + the relay + screen): screen 4.0 resizes a window bottom-anchored. Shrinking keeps the cursor's distance from the bottom, so with blank rows under the cursor (short output, after a clear) the output above it goes into screen's own history, which the view never shows, and only blank rows remain; growing pulls lines back in at the top. Fix to try: before a shrink, put the cursor on row max(0, old rows - new rows - blank rows under it) (screen then drops the blank bottom rows instead), apply the size, put the cursor back; the pty size has to wait for that (LocalProcessTerminalView.sizeChanged isn't open, so the relay holds it). Windows has no screen: check it there separately
- caveman with "ponytail": seen mentioned somewhere; find out what it is and whether it's worth building in
- Themes of your own: make a theme and keep up to 4 in slots; watching someone on the leaderboard, copy their theme into one of your 4 slots, as CS2 copies a crosshair: a copy of its own, so it stays as it was when its owner changes or deletes theirs
- Big update · accounts: sign in, and a user's Macs and Windows PCs join one account: their hours and XP add up there, and their settings sync between them by default (as VS Code's Settings Sync), which Settings can turn off
- Big update · extensions: users write extensions for the app as for VS Code, and add or remove them in Settings; first, research how VS Code does it (the extension API, the manifest, activation, the marketplace, how extensions are kept apart from the app)
- Chats: group chats, several friends in one conversation (users asked for it)
- Anime mode: a funny mode for the whole app, with anime girls and the like, and sound effects where they shout "uwu"
- Skins: sexy skins (requested)
- Token savers built in: rtk (Rust Token Killer: shortens command output before Claude reads it; 36% saved on Atalay's Mac) and caveman (terse replies), set up by the app for every user's Claude Code
- Remote control: a chat started with Claude's remote control on another of your computers (the Windows PC) shows here too; needs your devices linked into one account first (a pairing code, or the Claude account they share)

### From user feedback (2026-11-04; the messages: feedback/2026-11-04.md, kept off git)

- Fonts: one user loves the animations but can't read the UI's fonts (Settings · INTERFACE now; see whether it's enough)

### From user feedback (2026-11-02; the messages: feedback/2026-11-02.md, kept off git)

- Limits: one user on the 20 € plan saw 21% of the limit go on a 500k-context session (Opus 5.5, xhigh), more than in plain iTerm2, they say: check whether the app adds anything to Claude's usage, and tell users what drives it
- Shortcuts: one for the friends chat (to think about). Switching between the sessions on the dashboard's left is on hold: ⌘1, ⌘2 … already switch a terminal's tabs, so it needs other keys
- While Claude works: a small game to play in the background, shakes and the like
- Terminals (Mac): scrolling with Claude's full-screen TUI goes wrong for some (one tried `/tui default`, which garbled the screen until Esc); their Claude pointed at AppDelegate's scrollWheel monitor, ChatTerminal's wheelGoesToProgram() and SwiftTerm issue #583 (scrollback in the alternate screen)
- Terminals (Windows): copying output selects only a small area, and selecting everything copies only the beginning

### From user feedback (2026-10-31; the messages: feedback/2026-10-31.md, kept off git)

- Terminals: a theme picker like Termius's (colours, background, how see-through)
- Dashboard: widgets you arrange yourself: hide the ones you don't want (workers, your call…), add a chat widget, less clutter
- Dashboard: a small widget with general updates (what's new)

## 0.10.0

- Tabs and split panes in a window, with iTerm2's keys: ⌘T, ⌘D / ⇧⌘D, ⌘] ⌘[, ⌘1–⌘9, ⇧⌘T to bring a closed pane back; they keep running when the app quits
- Terminals: a new orange colour theme, a more solid background that's easier to read, your iTerm2 font and cursor
- Terminals: ⌘-click opens a file in its app and a link in the browser, even a long path broken over lines
- On fire: past 5 hours of work in a day, flames burn along your screen's edges and your card burns on the leaderboard and in friends' lists until the day ends
- Feedback: a speech bubble beside the main menu sends your feedback straight to the developer, no e-mail needed
- New terminal: 14 shortcut places around the folder picker
- Chats: the whole conversation stays scrollable while Claude writes
- Session cards: macOS-style buttons, red ends the session (after a question), yellow folds the card to one line
- One opacity everywhere: menus, friends' chats, notices and popups are as solid as the terminals
- The dashboard has no ⌘1 any more (it did nothing you could see)

## 0.9.0

- Security: only the released app can use friends, messages and levels; older versions need this update to keep earning XP

## 0.8.0

- Leaderboard: everyone's level and week, and a friend request one click away
- Hide your name on the leaderboard in Settings: you keep your place as Anonymous
- Each friend's chat opens in its own window, so several stay on screen
- Copy and paste work in chats and in the reply box
- A friend's new level shows in your chat right away
- The chat or terminal you clicked last is on top, and chats stay above the dashboard

## 0.7.0

- Levels and ranks: the time you actively work earns XP, from Academy Student up to Kage
- A level up takes over the screen for a moment, only while the app is in front
- Your profile: rank, XP, today's time, the week, your streak and the last 7 days
- Friends show their level and how long they worked today; their card shows their last 7 days
- +50 XP every day for showing up
- Settings: hide your active time from friends

## 0.6.3

- The mouse wheel scrolls Claude's own history, as in iTerm2, so a chat closed and opened again shows everything
- Terminals keep their history when the app quits or updates

## 0.6.2

- The shortcut wheel opens with a four-finger click now, so three-finger scrolling and dragging no longer open it

## 0.6.1

- Minimizing a terminal no longer turns the dashboard black
- A pasted paragraph reaches Claude as one message
- Images copied in Finder or dragged in reach Claude as images
- Selected text is highlighted, ⌘C copies it, and a note shows how many lines
- Option types @ # { } and the like; Shift+Return starts a new line; Option+Delete and Option+arrows work word by word
- Claude's red and green change lines are readable; terminals use your iTerm2 font
- New terminals start at the top; terminals left running don't pop up at launch
- Double-click a terminal's title to fill the screen; Fn+Control+arrows tiles it
- The pin keeps a terminal above every app; the clicked terminal comes to the front; menus open above terminals
- Parked chats and cars keep their spot; ending a terminal blows its car up
- A chat running in another copy of the app opens as a live mirror
- The cinematic camera waits for 5 minutes away from the Mac, films wider, and has an off button
- The update button's arrow drops into its tray while it updates

## 0.6.0

- Friends: a small notice when one comes online
- Idle terminals park at the edge of the orbit map
- A new, detailed flying car for terminals
- New versions announce themselves, with what's new
- Friend list and statuses stay live

## 0.5.0

- Friends, friend requests, chat and online statuses
