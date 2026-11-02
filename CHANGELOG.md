# Changelog

Each version's lines are its release notes: the app lists them on its "what's new" screen
(`app/scripts/release.sh <version> "<one line per change>"`).

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

- Chats: group chats, several friends in one conversation (users asked for it)
- Notifications: a screen where every notification shows, all in one place

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
