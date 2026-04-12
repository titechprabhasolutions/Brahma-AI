@echo off
setlocal enabledelayedexpansion

REM Brahma AI launcher (with desktop shortcut + logo)
cd /d "%~dp0"

set "ICON_PATH=%~dp0electron\assets\brahma.ico"
set "SHORTCUT=%USERPROFILE%\Desktop\Brahma AI (Local).lnk"

if not exist "%SHORTCUT%" (
  powershell -NoProfile -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; " ^
    "$Shortcut = $WshShell.CreateShortcut('%SHORTCUT%'); " ^
    "$Shortcut.TargetPath = 'cmd.exe'; " ^
    "$Shortcut.Arguments = '/c \"\"cd /d \"%~dp0\" && npm start\"\"'; " ^
    "$Shortcut.WorkingDirectory = '%~dp0'; " ^
    "$Shortcut.IconLocation = '%ICON_PATH%'; " ^
    "$Shortcut.Save();"
)

call npm start
