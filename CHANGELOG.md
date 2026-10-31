# Changelog

Each version's lines are its release notes: the app lists them on its "what's new" screen
(`app/scripts/release.sh <version> "<one line per change>"`).

## Unreleased (on the staging branch, out with the next version)

- New terminal: 14 shortcut places around the folder picker; a filled one opens a terminal in its folder at once

## Next

- Chats: ⌘W closes a friend's chat window
- Reminder: add Alper's suggestions from the chat here before planning the next features
- Settings: a feedback form, so complaints and requests go straight to the developer
- Messages: the reply box at the bottom right doesn't close while you're typing in it (today it can close when another message arrives)
- Messages: replying from the bottom-right box doesn't switch you to the app (today Enter brings the app forward, even from another desktop)
- Shortcut wheel: also opens with the mouse's middle button, for people without a trackpad (today only a four-finger click)
- Top bar: the 5-hour and weekly limits don't show for new installs; to decide: hide them while there's no data, so the bar isn't cluttered?
- Terminals: behave one to one like iTerm2 on macOS (e.g. 24-bit colour, which Apple's screen can't pass on)
- Terminals: iTerm2's shortcuts open a new terminal in the same folder here too (⌘T, ⇧⌘T, ⌘D, ⇧⌘D and the like); today they do nothing
- Git changes: a panel like VS Code's Git changes or GitKraken / GitLens, to see what code a session changed (changed files and their diffs)

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
