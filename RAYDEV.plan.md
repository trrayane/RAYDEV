# RAYDEV — Implementation Plan

Premium Windows desktop dev environment: Tauri 2 + React + real interactive WSL 2 terminal.
Product name: **RAYDEV**. Design language: **NeoShell tokens** mapped into **Tailwind CSS**.

---

## 0. Machine findings (verified 2026-10-17)

| Item | Status |
|---|---|
| Working dir `C:\Users\HP\Desktop\wsl interface` | Empty (greenfield) |
| Node v20.20.1 / npm 10.8.2 / registry reachable | OK |
| Git, WebView2 155.x runtime | OK |
| WSL 2.7.10 | Installed |
| Distributions | **Only `Ubuntu`** (Ubuntu 26.04 LTS, x86_64, stopped, default). No `Ubuntu-26.04`, no `docker-desktop` — detection must be fully dynamic |
| Inside Ubuntu | Python 3.14.4, git 2.53; no gcc/cmake/make (report-only, never auto-install) |
| Rust | Half-installed: `~/.rustup` has `stable-x86_64-pc-windows-msvc` (550MB), but no `~/.cargo`, no `rustup.exe` |
| MSVC Build Tools / Windows SDK | **Missing** — required to link Tauri on Windows |
| Free disk on C: | **~8.65 GB** — tight; minimal VS component set + artifact cleanup required |

## 1. Locked decisions

- **Styling:** Tailwind CSS (v4, `@tailwindcss/vite`) with all NeoShell tokens defined as CSS custom properties in `:root` / `[data-theme]`, surfaced to Tailwind via `@theme`. Component CSS (xterm overrides, titlebar drag region) in plain CSS files.
- **Prerequisites:** install via winget — `Rustlang.Rustup` + `Microsoft.VisualStudio.2022.BuildTools` (minimal C++ components, see Phase 1).
- **Name:** RAYDEV (`productName: "RAYDEV"`, identifier `dev.raydev.app`). "NeoShell" remains the theme/design-system name only.
- **Distro handling:** dynamic detection; default = WSL default distro (currently `Ubuntu`). Never hardcode `Ubuntu-26.04`.

## 2. Architecture

```
React UI (xterm.js) ⇄ Tauri events/commands ⇄ Rust session manager ⇄ portable-pty (ConPTY) ⇄ wsl.exe -d <dist> --cd <path>
```

- **PTY:** `portable-pty` (wezterm project, actively maintained, native ConPTY on Windows). One `native_pty_system().openpty()` per session; spawn `wsl.exe` with structured argv — **no shell string concatenation**.
- **Transport:** output chunks base64-encoded in events (`raydev://pty-output {id, data}`) to stay JSON/binary-safe; input via `pty_write(id, base64)` command. Output batching: accumulate ~8–16KB or ~16ms before emit.
- **Lifecycle:** Rust `SessionManager` = `Mutex<HashMap<SessionId, Session>>`. Close tab → drop MasterPty + kill child (ends that bash only; never touches other sessions/distro VM). `raydev://pty-exit {id, code}` on termination. Frontend guards against duplicate `create_session` calls.
- **WSL parsing:** `wsl.exe -l -v` outputs **UTF-16LE** — decode with `String::from_utf16`, strip NULs/BOM, parse `*` default marker, name, version, state. Same decoding for `--status`/`--version`.
- **Settings:** `settings.json` in app config dir via custom `load_settings`/`save_settings` commands (serde with `#[serde(default)]` validation). No secrets stored.
- **Security:** Tauri 2 capabilities scoped to: core window (min/max/close/start-dragging), dialog (open project folder), core event defaults. Restrictive CSP per Tauri v2 docs. All process/fs work in Rust; path ops validated (canonicalize, must stay under declared project root; reject traversal). Terminal output treated as plain text only.

## 3. Phases

### Phase 1 — Prerequisites + scaffold
1. Verify free disk; record baseline.
2. `winget install Rustlang.Rustup` (reuses existing `~/.rustup` toolchain; restores `~/.cargo`).
3. `winget install Microsoft.VisualStudio.2022.BuildTools` with minimal components:
   `--override "--add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.VC.CMake.Project --add Microsoft.VisualStudio.Component.Windows11SDK.26100 --passive --norestart"`
4. Verify: `cargo --version`, `rustc --version`, `link.exe` on PATH via `cargo build` smoke test of an empty crate (MSVC target already default).
5. Scaffold with `create-tauri-app` (react-ts template, npm); rename to RAYDEV, set identifier.
6. Add deps — frontend: `@xterm/xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`, `@xterm/addon-search`, `@xterm/addon-unicode11`, `zustand`, `lucide-react`; backend: `portable-pty`, `serde`, `serde_json`, `base64`, `anyhow`, `thiserror`.
7. Map full NeoShell token set (colors incl. status/syntax/terminal, typography, radii, shadows, animations) into `src/styles/tokens.css` + Tailwind `@theme`; implement dark (default), light, and system themes via `data-theme` attribute.
8. `npm run tauri dev` boots with empty shell — verify.

### Phase 2 — IDE shell layout (NeoShell)
- `AppShell`: custom 32px titlebar (drag region, RAYDEV mark, WSL badge, min/max/close via Tauri window API), 44px activity bar, resizable sidebar, main area, bottom panel, 28px status bar.
- Views switched by activity bar (Explorer, Terminal, Environments, Settings) — no router (pane-based IDE, keeps deps minimal).
- SplitView divider component; persist panel sizes/visibility in settings.
- Reusable controls styled from tokens: Button, IconButton, Badge (status variants), Input, Select, Toggle, Tooltip, Modal (confirm dialog), Notification toasts, Spinner, ProgressBar, SystemStatusBadge.
- Keyboard shortcut registry (configurable): Ctrl+Shift+T new terminal, Ctrl+Shift+W close, Ctrl+B sidebar, Ctrl+Shift+P palette, Ctrl+F terminal search, Ctrl+, settings. Never intercept keys when palette/search overlay is closed and terminal focused, except app-level chords.

### Phase 3 — Real WSL terminal (P0)
- Rust `wsl.rs`: `list_distributions()` (`-l -v`, UTF-16LE parse), `get_status()`, `get_version()`; graceful "WSL not found" errors.
- Rust `pty.rs`: SessionManager + commands `create_session(dist, cwd?, cols, rows) -> id`, `write`, `resize`, `kill`, `list`; events `raydev://pty-output`, `raydev://pty-exit`. Spawn: `wsl.exe -d <dist> --cd <cwd|~>`. Reader thread with chunked base64 emit.
- Frontend `TerminalView`: xterm instance per session (FitAddon, WebLinksAddon, SearchAddon, Unicode11Addon), NeoShell terminal theme, onData→write, debounced resize→`pty_resize`, FitAddon on container resize.
- Terminal tabs: independent sessions, titles from distro+cwd, close/restart with confirm-when-running, exit status display, error state + retry when spawn fails.
- Toolbar: new tab, distro select, cwd select (project root), split H/V (two xterm panes sharing or new session — implement as new independent session per pane), clear, search overlay, copy/paste, restart, kill, fullscreen toggle.
- Manual test matrix: `python3 --version`, interactive python REPL, Ctrl+C interrupt, Ctrl+D, Tab completion, arrow history, ANSI colors (ls --color), Unicode (`é 中 ü`), long-running `sleep 60` + interrupt, resize during run, two tabs independence, tab close cleanup, stopped distro cold-start.

### Phase 4 — Projects, environments, settings, palette
- **Explorer:** open-folder dialog (Windows paths incl. `\\wsl.localhost\Ubuntu\...` UNC — std::fs handles); tree with hidden-files toggle, refresh, create file/folder, rename, delete (modal confirm, only under root); "Open in terminal here" (pass path to `wsl.exe --cd`, which accepts both Windows and Linux paths — no string-splicing into a shell). Rust fs commands with root-containment validation. Recent projects persisted.
- **Environment manager:** distro cards (name, state, version, default★), refresh, select active distro, launch terminal here; one-shot diagnostics in selected distro (`uname -a`, `/etc/os-release`, `python3 --version`, `git --version`, `gcc --version`) with timeouts; Ubuntu bootstrap checklist (show commands, never execute); `docker-desktop` (if ever present) gets destructive controls hidden.
- **Settings view:** theme, font family/size, line height, cursor style, scrollback, default distro, default project dir, startup behavior, shortcut editing, destructive-action confirmations, reset. Live-apply to open terminals.
- **Command palette** (Ctrl+Shift+P): fuzzy list from live command registry (open terminal, select distro, open project, open project in terminal, toggle theme, settings, refresh env) — state-aware, confirmations for destructive entries.
- **Resource monitor** (lightweight): active session count + per-session uptime, optional manual-on-demand snapshot via one-shot commands; disable toggle + refresh interval in settings; show real errors, never fabricated metrics.

### Phase 5 — Tests, packaging, docs
- Rust unit tests: UTF-16 `-l -v` parser (byte fixtures), path-containment validator, settings serde defaults.
- Vitest: token/theme resolution, shortcut matching, palette filtering, base64 chunk helpers. RTL smoke tests for StatusBar/Modal.
- `cargo test`, `npm test`, then `npm run tauri build` (cleanup debug artifacts first if disk <2GB). Installer → `src-tauri/target/release/bundle/`.
- Manual acceptance pass: AT-001…AT-013 from the spec (mapping below).
- Deliverables: README (setup, usage, launch), `docs/TROUBLESHOOTING.md`, `docs/PACKAGING.md`. Verify WSL distros/files untouched after install.

## 4. Acceptance mapping

| AT | Covered by |
|---|---|
| AT-001 distros detected unchanged | Phase 3 `list_distributions`, read-only `wsl` calls only |
| AT-002/003/004 real bash + python3 + responsive | ConPTY bridge, batched events, manual tests |
| AT-005 Ctrl+C | PTY input `\x03` → SIGINT in-session |
| AT-006 completion/history/colors/Unicode/resize | addons + resize propagation tests |
| AT-007 independent tabs | per-session PTY instances |
| AT-008 cold-start stopped distro | `wsl.exe -d <stopped>` starts VM on demand |
| AT-009 close releases resources | per-session kill only |
| AT-010 Linux + Windows paths | UNC via std::fs; `--cd` accepts both |
| AT-011 settings persist | settings.json in app config dir |
| AT-012 no admin needed | standard user install, no elevation in build/run |
| AT-013 destructive confirmations | Modal confirm gates kill/delete/wipe |

## 5. Risks & mitigations

- **Disk (~8.65GB):** minimal VS components; delete `target/debug` before release build; monitor free space each phase; fall back to `tauri build --no-bundle` + document if bundler space fails.
- **UTF-16 wsl output:** handled in Rust decoder; unit-tested.
- **xterm v5 package rename:** use scoped `@xterm/*` packages.
- **Long-running output:** no timeouts on PTY; batching + xterm scrollback cap prevent unbounded growth.

## 6. Launch & verify commands

```powershell
cd "C:\Users\HP\Desktop\wsl interface"
npm install
npm run tauri dev      # development
npm run tauri build    # production installer
```
