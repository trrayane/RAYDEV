import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, FolderOpen, Palette, Settings, RefreshCw, Boxes, Search } from "lucide-react";
import { useUi } from "../../store/ui";
import { useTerminal } from "../../store/terminal";
import { useEnvironment } from "../../store/environment";
import { useSettings } from "../../store/settings";
import { open } from "@tauri-apps/plugin-dialog";

interface Cmd {
  id: string;
  label: string;
  icon: typeof Terminal;
  shortcut?: string;
  run: () => void | Promise<void>;
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, setActiveView, setProjectRoot, pushToast } = useUi();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openSession = useTerminal((s) => s.openSession);
  const selectedDistro = useEnvironment((s) => s.selectedDistro);
  const refreshEnv = useEnvironment((s) => s.refresh);
  const setTheme = useSettings((s) => s.setTheme);
  const theme = useSettings((s) => s.settings.theme);

  const commands: Cmd[] = useMemo(
    () => [
      {
        id: "new-terminal",
        label: "Terminal: New terminal",
        icon: Terminal,
        shortcut: "Ctrl+Shift+T",
        run: async () => {
          const d = selectedDistro ?? "Ubuntu";
          try {
            await openSession(d, null, 80, 24);
          } catch (e) {
            pushToast({ variant: "error", title: "Failed", message: String(e) });
          }
        },
      },
      {
        id: "open-project",
        label: "Project: Open folder…",
        icon: FolderOpen,
        run: async () => {
          const dir = await open({ directory: true, title: "Open project" });
          if (typeof dir === "string") {
            setProjectRoot(dir);
            useSettings.getState().addRecentProject(dir);
            setActiveView("explorer");
          }
        },
      },
      {
        id: "open-terminal-here",
        label: "Project: Open project in terminal",
        icon: Terminal,
        run: async () => {
          const root = useUi.getState().projectRoot;
          const d = selectedDistro ?? "Ubuntu";
          try {
            await openSession(d, root, 80, 24);
            setActiveView("terminal");
          } catch (e) {
            pushToast({ variant: "error", title: "Failed", message: String(e) });
          }
        },
      },
      {
        id: "toggle-theme",
        label: `Appearance: Toggle theme (currently ${theme})`,
        icon: Palette,
        run: () => setTheme(theme === "dark" ? "light" : "dark"),
      },
      {
        id: "settings",
        label: "Preferences: Open settings",
        icon: Settings,
        shortcut: "Ctrl+,",
        run: () => setActiveView("settings"),
      },
      {
        id: "refresh-env",
        label: "Environment: Refresh WSL status",
        icon: RefreshCw,
        run: () => refreshEnv(),
      },
      {
        id: "env-view",
        label: "Environment: Open environment manager",
        icon: Boxes,
        run: () => setActiveView("environments"),
      },
    ],
    [selectedDistro, openSession, setProjectRoot, setActiveView, pushToast, setTheme, theme, refreshEnv]
  );

  const filtered = useMemo(
    () =>
      query.trim()
        ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
        : commands,
    [commands, query]
  );

  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [paletteOpen]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  if (!paletteOpen) return null;

  const exec = async (cmd: Cmd) => {
    setPaletteOpen(false);
    await cmd.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-[4px] animate-fade-in"
      onClick={() => setPaletteOpen(false)}
    >
      <div
        className="w-[520px] max-w-[90vw] bg-[var(--color-bg-overlay)] border border-[var(--color-border-accent)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 h-11 border-b border-[var(--color-border-subtle)]">
          <Search size={15} className="text-[var(--color-text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[index]) {
                exec(filtered[index]);
              } else if (e.key === "Escape") {
                setPaletteOpen(false);
              }
            }}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-[13px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-auto py-1">
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-[12px] text-[var(--color-text-muted)]">No matching commands</p>
          )}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => exec(cmd)}
              onMouseEnter={() => setIndex(i)}
              className={`flex items-center gap-2.5 w-full px-4 h-8 text-[12px] text-left cursor-pointer transition-colors ${
                i === index
                  ? "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)]"
              }`}
            >
              <cmd.icon size={14} className="shrink-0" />
              <span className="flex-1 truncate">{cmd.label}</span>
              {cmd.shortcut && (
                <kbd className="text-[10px] text-[var(--color-text-muted)] font-mono">{cmd.shortcut}</kbd>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
