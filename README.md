# RAYDEV

A premium Windows 11 desktop development environment built with **Tauri 2**, **React** and a real **WSL 2** terminal.

![status](https://img.shields.io/badge/platform-Windows%2011-blue)
![tauri](https://img.shields.io/badge/Tauri-2-orange)
![react](https://img.shields.io/badge/React-19-61dafb)
![rust](https://img.shields.io/badge/Rust-MSVC-000000?logo=rust)

## Features

- **Native interactive terminal** — ConPTY (`portable-pty`) sessions that launch `wsl.exe` directly, with tabs, split views, resize, flow control and exit-code reporting.
- **Automatic WSL detection** — lists your distributions, skips managed ones (`docker-desktop`), follows the default, no configuration needed.
- **Explorer** — browse both the Linux filesystem (`\\wsl.localhost\...`) and Windows drives; `/mnt/<drive>` paths resolve to the real drive letter.
- **Environment panel** — host and distro diagnostics (CPU/memory, Python, git, toolchains).
- **Settings & command palette** — persisted configuration, `Ctrl+K` palette, custom title bar.

## Quick start

```powershell
npm install
npm run tauri dev      # development
npm run tauri build    # NSIS / MSI installers
```

Requirements: Windows 11, WSL 2 with at least one usable distribution, Rust (MSVC), Node 20+.

## Tests

```powershell
cd src-tauri
cargo test             # 67 unit tests + 18 live WSL integration tests
```

The integration tests talk to a real distribution over a real PTY; set `RAYDEV_SKIP_WSL_TESTS=1` to skip them, or `RAYDEV_TEST_DISTRO=<name>` to target a specific distro.

## Architecture

```
src/                    React frontend (xterm.js, Zustand stores)
src/components/         Title bar, explorer, terminal, environment, settings
src-tauri/src/
  pty.rs                ConPTY session manager (reader / writer / waiter threads)
  wsl.rs                WSL detection, exec, session markers
  location.rs           Linux + Windows path model with root validation
  fsops.rs              Filesystem operations, confined to a validated root
  commands.rs           Tauri command surface
```
