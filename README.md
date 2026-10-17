<div align="center">

# RAYDEV

### Premium WSL 2 Development Environment for Windows

**Real interactive Linux terminal · Project explorer · Environment manager · NeoShell UI**

[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.99-DEA584?logo=rust&logoColor=black)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## Overview

RAYDEV is a native Windows desktop application that gives you a **real, interactive WSL 2 terminal** inside a polished, customizable IDE-style interface. It is not a mock or a command-runner — every keystroke, signal, and byte of output flows through a genuine Windows ConPTY bridge into your Linux distribution.

Built for Python, C/C++, computer-vision, web, and Docker developers who live in WSL 2.

## Features

- **Real WSL 2 Terminal** — interactive Bash via ConPTY (`portable-pty`). Ctrl+C, Tab completion, arrow keys, ANSI colors, Unicode, resize propagation, long-running processes.
- **Multiple Tabs** — independent PTY sessions. Closing one never affects another.
- **Dynamic Distro Detection** — reads `wsl.exe -l -v` (UTF-16LE aware). Works with any installed distribution; no hardcoded names.
- **Project Explorer** — open folders (Windows or `\\wsl.localhost` UNC), navigate trees, create / rename / delete (validated to stay inside the project root), open any directory in a terminal.
- **Environment Manager** — list distros with live state, select default, run read-only diagnostics (`uname`, `os-release`, `python3`, `git`, `gcc`).
- **Command Palette** — `Ctrl+Shift+P` fuzzy command search.
- **Settings** — theme (dark / light / system), font, cursor, scrollback, default distro, destructive-action confirmations. Persisted locally.
- **NeoShell Design System** — dark by default, red accent, CSS custom properties mapped into Tailwind v4.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  React UI (xterm.js + Tailwind v4 + NeoShell tokens)     │
│                    ↕ Tauri 2 commands & events           │
│  Rust backend (SessionManager · WSL parser · FS guard)   │
│                    ↕ ConPTY (portable-pty)               │
│  wsl.exe -d <distro> --cd <path>                         │
│                    → interactive Bash inside the distro   │
└──────────────────────────────────────────────────────────┘
```

| Layer | Tech |
|---|---|
| Shell / Window | Tauri 2 (Rust + WebView2) |
| Frontend | React 19, TypeScript, Vite 8 |
| Styling | Tailwind CSS v4, NeoShell design tokens |
| Terminal | xterm.js + Fit / WebLinks / Search / Unicode11 addons |
| PTY | `portable-pty` (native Windows ConPTY) |
| State | Zustand |
| Icons | Lucide |

## Quick Start

### Prerequisites

| Requirement | Check | Install |
|---|---|---|
| Windows 11 | `winver` | — |
| WSL 2 | `wsl --version` | `wsl --install` (restart required) |
| A WSL distro | `wsl -l -v` | `wsl --install -d Ubuntu` |
| Node.js 20+ | `node --version` | https://nodejs.org |
| Rust (rustup) | `cargo --version` | `winget install Rustlang.Rustup` |
| VS Build Tools 2022 | see below | `winget install Microsoft.VisualStudio.2022.BuildTools` |

Add the following components via the Visual Studio Installer:

- `Microsoft.VisualStudio.Component.VC.Tools.x86.x64`
- `Microsoft.VisualStudio.Component.VC.CMake.Project`
- `Microsoft.VisualStudio.Component.Windows11SDK.26100`

### Build & Run

```bash
# Clone
git clone https://github.com/trrayane/RAYDEV.git
cd RAYDEV

# Install dependencies
npm install

# Development (Vite + Rust hot-reload)
npm run tauri dev

# Production build → exe + NSIS/MSI installers
npm run tauri build
```

Output after `tauri build`:

- **Executable** — `src-tauri/target/release/raydev.exe`
- **NSIS installer** — `src-tauri/target/release/bundle/nsis/RAYDEV_*_x64-setup.exe`
- **MSI installer** — `src-tauri/target/release/bundle/msi/RAYDEV_*_x64_en-US.msi`

The app runs as a **standard user** — no administrator privileges required.

## Testing

```bash
npm test                    # Vitest (frontend)
cd src-tauri && cargo test  # Rust unit tests
```

Rust tests cover the UTF-16LE WSL parser, filesystem root-containment validator, and settings serialization.

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| New terminal | `Ctrl+Shift+T` |
| Close active terminal | `Ctrl+Shift+W` |
| Toggle sidebar | `Ctrl+B` |
| Command palette | `Ctrl+Shift+P` |
| Search terminal | `Ctrl+F` |
| Open settings | `Ctrl+,` |

## Project Structure

```
RAYDEV/
├── src/                        # React frontend
│   ├── components/
│   │   ├── layout/             # TitleBar, ActivityBar, StatusBar
│   │   ├── terminal/           # TerminalView (xterm), TerminalPanel
│   │   ├── explorer/           # File tree
│   │   ├── environment/        # Distro manager
│   │   ├── settings/           # Settings panel
│   │   ├── overlay/            # Modal, CommandPalette, Toasts
│   │   └── ui/                 # Button, Badge, Input, Toggle…
│   ├── store/                  # Zustand stores
│   ├── lib/                    # API wrappers, path utils
│   ├── styles/                 # NeoShell tokens, global CSS
│   └── types/                  # Shared TypeScript types
├── src-tauri/                  # Rust backend
│   └── src/
│       ├── pty.rs              # ConPTY session manager
│       ├── wsl.rs              # WSL detection (UTF-16LE)
│       ├── fs_ops.rs           # Validated filesystem ops
│       └── settings.rs         # Persistent settings
├── tests/                      # Vitest tests
└── docs/                       # Troubleshooting guide
```

## Security

- No shell string concatenation — all process arguments are structured.
- Filesystem operations validated against the declared project root (canonicalized, traversal rejected).
- Terminal output treated as untrusted text; never evaluated as code.
- No secrets stored. Settings are local JSON.
- Runs as a standard user, not elevated.

## Limitations

- `docker-desktop` destructive controls are hidden (managed system distro).
- Resource monitoring is lightweight (session count + uptime); deep WSL sampling is manual to avoid spawning expensive processes.
- First cold start of a stopped distro takes a few seconds (WSL VM boot).
- For Linux-heavy workloads, prefer keeping projects inside the WSL filesystem (`/home/<user>/projects`) for best I/O performance.

## Troubleshooting

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) for common issues and fixes.

## License

MIT © [Rayane Terki](https://github.com/trrayane)

---

<div align="center">
  <sub>Built with <a href="https://tauri.app">Tauri</a> · <a href="https://react.dev">React</a> · <a href="https://xtermjs.org">xterm.js</a></sub>
</div>
