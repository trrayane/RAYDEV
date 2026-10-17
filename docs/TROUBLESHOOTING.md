# RAYDEV Troubleshooting

## App won't start / blank window

- Run from a terminal to see logs: `npm run tauri dev`
- Check WebView2 runtime is installed (Windows 11 ships with it). Repair: `winget install Microsoft.EdgeWebView2Runtime`
- Delete cached build: `Remove-Item -Recurse -Force src-tauri\target\debug` then rebuild.

## "wsl.exe is not available"

- WSL is not installed or not on PATH. From an **elevated** PowerShell: `wsl --install`
- Restart Windows after installing.
- Verify: `wsl --version` should print a version.

## Terminal opens but no prompt / exits immediately

- Check the distro name matches exactly: `wsl -l -v` (names are case-sensitive).
- Try launching manually: `wsl -d Ubuntu --cd ~`
- If the distro is "Installing" or broken, repair it from Windows Settings → Apps → Advanced options, or `wsl --manage <name> --set-default-user <user>`.

## Terminal output is garbled / missing UTF-16 characters

- RAYDEV decodes `wsl.exe` output as UTF-16LE automatically. If you still see NUL bytes, ensure you are not piping through a third-party shell that re-encodes output.

## Ctrl+C does not interrupt a process

- This is a real PTY, so Ctrl+C sends SIGINT to the foreground process group. If a program ignores SIGINT (e.g. `sleep` with trap), use Ctrl+Z then `kill %1`, or Ctrl+\ (SIGQUIT).

## Build fails: "linker not found" or "MSVC target not found"

- VS Build Tools C++ components are missing. Install via winget:
  ```
  winget install Microsoft.VisualStudio.2022.BuildTools
  # Then modify to add:
  #   Microsoft.VisualStudio.Component.VC.Tools.x86.x64
  #   Microsoft.VisualStudio.Component.VC.CMake.Project
  #   Microsoft.VisualStudio.Component.Windows11SDK.26100
  ```
- Or open the Visual Studio Installer → Modify → check "Desktop development with C++".

## Build fails: "out of disk space"

- Clean old artifacts:
  ```
  Remove-Item -Recurse -Force src-tauri\target\debug
  npm cache clean --force
  ```
- The release profile uses LTO + strip to minimize binary size. Avoid `cargo build --release` with debug symbols during development.

## `wsl -l -v` returns unexpected distro list

- RAYDEV never modifies your distros. If a distro is missing, it is simply not installed. The app detects dynamically; it does not assume `Ubuntu-26.04` or `docker-desktop` exist.

## Project explorer shows nothing / permission denied

- The selected folder must be readable by your Windows user. For `\\wsl.localhost\...` paths, the WSL distro must be running.
- Prefer Linux-native projects inside the WSL filesystem for the best performance: `/home/<user>/projects/myproject`.

## File operations are rejected ("escapes project root")

- This is a security boundary. You cannot create, rename, or delete files outside the currently open project root. Open a parent folder if you need broader access.

## Settings don't persist

- Settings are stored in `%APPDATA%\dev.raydev.app\settings.json`. Check the file is writable. Delete it to reset to defaults.

## Terminal search (Ctrl+F) doesn't find text

- Search operates on the xterm.js buffer. Very old output may have been trimmed if it exceeds the scrollback limit (default 5000 lines, configurable in Settings).

## Slow first launch of a distro

- WSL 2 boots a lightweight VM on first use. Subsequent sessions are fast. If you need the VM always warm, run `wsl -d Ubuntu --exec true` in a background task, or leave one terminal open.

## Application won't close / zombie processes

- RAYDEV kills all its PTY sessions on window destroy. If a `wsl.exe` or `bash` process remains, terminate it manually:
  ```
  wsl --terminate Ubuntu
  ```
- Do **not** use `wsl --shutdown` unless you intend to stop all distros including Docker Desktop's.

## How to report a bug

1. Note your Windows version (`winver`), WSL version (`wsl --version`), and distro list (`wsl -l -v`).
2. Reproduce in `npm run tauri dev` and capture the terminal output.
3. Check `%APPDATA%\dev.raydev.app\` for logs and attach relevant excerpts (redact usernames/paths if sensitive).
