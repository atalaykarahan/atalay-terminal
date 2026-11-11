; Uninstalling ends the session host (src/host.cs) and removes its program: it runs from outside the app's folder, so
; that an update's installer leaves it and its chats running. Taking the app away takes them too; the uninstall an
; update makes of the old version doesn't.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    nsExec::Exec `"$SYSDIR\cmd.exe" /C taskkill /F /IM "atalay-terminal-host-*" /FI "USERNAME eq %USERNAME%"`
    Pop $0
    RMDir /r "$LOCALAPPDATA\atalay-terminal-host"
  ${endIf}
!macroend

; The program file takes the app's name, so renaming the app (Atalay's Terminal became Orbiterm) renames it too, and a
; taskbar pin made before still opens the old one, which the update removed. The pin, named as the old shortcut was,
; is pointed at the new program, so it opens the app again.
!macro customInstall
  ${if} $oldShortcutName != "${SHORTCUT_NAME}"
  ${andIf} ${FileExists} "$QUICKLAUNCH\User Pinned\TaskBar\$oldShortcutName.lnk"
    CreateShortCut "$QUICKLAUNCH\User Pinned\TaskBar\$oldShortcutName.lnk" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    ClearErrors
    WinShell::SetLnkAUMI "$QUICKLAUNCH\User Pinned\TaskBar\$oldShortcutName.lnk" "${APP_ID}"
  ${endIf}
!macroend
