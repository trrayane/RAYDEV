<p align="center">
  <img src="docs/logo.svg" width="140" alt="RAYDEV logo" />
</p>

<h1 align="center">RAYDEV</h1>

<p align="center">
  <strong>Native WSL&nbsp;2 development environment for Windows&nbsp;11</strong><br/>
  A premium desktop workspace with a real interactive Linux terminal, project explorer and environment diagnostics.
</p>

<p align="center">
  <a href="https://github.com/trrayane/RAYDEV/releases/latest"><img src="https://img.shields.io/github/v/release/trrayane/RAYDEV?style=flat-square&label=release&color=22C55E" alt="release" /></a>
  <img src="https://img.shields.io/badge/platform-Windows%2011%20x64-0078d4?style=flat-square&logo=windows11" alt="platform" />
  <img src="https://img.shields.io/badge/Tauri-2-24c8db?style=flat-square&logo=tauri&logoColor=white" alt="tauri" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=black" alt="react" />
  <img src="https://img.shields.io/badge/Rust-MSVC-dea584?style=flat-square&logo=rust" alt="rust" />
  <img src="https://img.shields.io/badge/tests-85%20passed-22C55E?style=flat-square" alt="tests" />
</p>

---

## Why RAYDEV?

Windows terminals treat WSL as a black box. RAYDEV makes it a first-class workspace: every session is a **real ConPTY pseudo-terminal** driving `wsl.exe` directly — the same plumbing used by WezTerm and Windows Terminal — wrapped in a fast, keyboard-driven desktop app.

- **Interactive WSL 2 terminal** — tabs, live resize, Unicode, ANSI colors, tab-completion, history, `Ctrl+C`/`Ctrl+D`, exit codes and backpressure, all verified against a real distribution.
- **Smart distro detection** — finds your installed distributions, skips managed ones (`docker-desktop`), follows the WSL default. Zero configuration.
- **Project explorer** — browse Linux and Windows paths side by side; `/mnt/c/...` resolves to the real `C:\...` drive.
- **Environment diagnostics** — toolchain presence (Python, git, gcc, make…), host CPU/memory and subsystem health at a glance.
- **Process simulator** — step through `fork()`, `wait()`, `sleep()` and zombie states with a live PID tree.
- **Settings & command palette** — persisted configuration and `Ctrl+K` palette, custom chrome-less title bar.

## Install

**From a release (recommended)**

1. Download [`RAYDEV_0.1.0_x64-setup.exe`](https://github.com/trrayane/RAYDEV/releases/latest)
2. Run it — per-user install, no admin rights needed
3. Launch **RAYDEV** from the Start Menu or Desktop

**From source**

```powershell
git clone https://github.com/trrayane/RAYDEV.git
cd RAYDEV
npm install
npm run tauri dev      # development
npm run tauri build    # NSIS installer + standalone exe
```

> Requirements: Windows 11 x64, WSL 2 with at least one usable distribution, Node 20+, Rust (MSVC toolchain).

## Testing

```powershell
cd src-tauri
cargo test
```

| Suite | Count | What it covers |
|---|---|---|
| Unit | 67 | path model, WSL parsing, settings, flow control, fsops |
| Integration | 18 | **live PTY sessions** against your real distribution |

The integration suite drives real shells over ConPTY — readiness, Unicode, ANSI pass-through, tab completion, history, `Ctrl+C`/`Ctrl+D`, resize, session isolation, exit status and backpressure.

- `RAYDEV_SKIP_WSL_TESTS=1` — skip integration tests
- `RAYDEV_TEST_DISTRO=<name>` — target a specific distribution

## Architecture

```
RAYDEV
├── src/                          React frontend
│   ├── components/
│   │   ├── layout/               Title bar, activity bar, dashboard
│   │   ├── terminal/             xterm.js panes, tabs, split view
│   │   ├── explorer/             File tree, folder picker
│   │   ├── environment/          Toolchain & host diagnostics
│   │   └── processes/            C process simulator + PID tree
│   ├── lib/                      IPC layer, terminal theme
│   └── store/                    Zustand stores
└── src-tauri/                    Rust backend
    ├── pty.rs                    ConPTY session manager
    │                             (reader / writer / waiter threads)
    ├── wsl.rs                    Detection, exec, session markers
    ├── location.rs               Linux + Windows path model
    ├── fsops.rs                  Root-confined filesystem ops
    └── commands.rs               Tauri command surface
```

**Terminal pipeline:** UI ⇆ Tauri IPC ⇆ `SessionManager` ⇆ ConPTY ⇆ `wsl.exe` ⇆ bash. Flow control pauses reading when the UI lags, so the Linux side is back-pressured by the kernel instead of flooding memory.

## Tech stack

| Layer | Choice |
|---|---|
| Shell | Tauri 2 (Rust) |
| UI | React 19 + TypeScript + Tailwind CSS v4 |
| Terminal | `@xterm/xterm` on native ConPTY (`portable-pty`) |
| State | Zustand |
| Metrics | `sysinfo` |

## License

All rights reserved — see the repository owner.
