import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  X,
  RotateCw,
  Copy,
  Clipboard,
  Trash2,
  Maximize2,
  Minimize2,
  Search,
  Columns2,
  Rows2,
} from "lucide-react";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { TerminalView } from "./TerminalView";
import { useTerminal } from "../../store/terminal";
import { useEnvironment } from "../../store/environment";
import { useSettings } from "../../store/settings";
import { useUi } from "../../store/ui";
import { IconButton } from "../ui/IconButton";
import { ConfirmDialog } from "../overlay/Modal";

export function TerminalPanel() {
  const {
    sessions,
    activeId,
    openSession,
    kill,
    setActive,
    fullscreen,
    setFullscreen,
    splitMode,
    setSplitMode,
  } = useTerminal();
  const { status, selectedDistro } = useEnvironment();
  const settings = useSettings((s) => s.settings);
  const { pushToast } = useUi();
  const [confirmKill, setConfirmKill] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const distros = status?.distros ?? [];
  const activeSession = sessions.find((s) => s.id === activeId);

  const createSession = useCallback(
    async (distro?: string, cwd?: string | null) => {
      if (creating) return;
      setCreating(true);
      try {
        const d = distro ?? selectedDistro ?? settings.defaultDistro ?? distros[0]?.name;
        if (!d) {
          pushToast({
            variant: "warning",
            title: "No WSL distribution",
            message: "Install or select a distribution first.",
          });
          return;
        }
        const rect = containerRef.current?.getBoundingClientRect();
        const cols = Math.max(40, Math.floor((rect?.width ?? 800) / 8));
        const rows = Math.max(10, Math.floor((rect?.height ?? 400) / 16));
        await openSession(d, cwd ?? null, cols, rows);
      } catch (e) {
        pushToast({
          variant: "error",
          title: "Terminal failed",
          message: String(e),
        });
      } finally {
        setCreating(false);
      }
    },
    [creating, selectedDistro, settings.defaultDistro, distros, openSession, pushToast]
  );

  // Auto-open first session
  useEffect(() => {
    if (sessions.length === 0 && status?.installed && !creating) {
      const d = selectedDistro ?? status.defaultDistro ?? status.distros[0]?.name;
      if (d) createSession(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.installed, selectedDistro]);

  const handleKill = async () => {
    if (!activeId) return;
    if (settings.confirmDestructive && activeSession?.status === "running") {
      setConfirmKill(true);
      return;
    }
    await kill(activeId);
  };

  const handleCopy = async () => {
    try {
      const term = document.querySelector(".xterm");
      const sel = (term as unknown as { terminal?: { getSelection(): string } })
        ?.terminal?.getSelection?.();
      if (sel) await writeText(sel);
    } catch {
      /* ignore */
    }
  };

  const handlePaste = async () => {
    try {
      const text = await readText();
      if (text && activeId) {
        const { write } = useTerminal.getState();
        const bytes = new TextEncoder().encode(text);
        let binary = "";
        for (const b of bytes) binary += String.fromCharCode(b);
        await write(activeId, btoa(binary));
      }
    } catch {
      /* ignore */
    }
  };

  const searchAddonRef = useRef<{ findNext: (t: string) => boolean; findPrevious: (t: string) => boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchOpen = useUi((s) => s.searchOpen);
  const setSearchOpen = useUi((s) => s.setSearchOpen);

  const visibleSessions =
    splitMode === "none"
      ? activeId
        ? [activeId]
        : []
      : sessions.slice(0, 2).map((s) => s.id);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-[var(--color-bg-panel)] ${fullscreen ? "fixed inset-0 z-30" : ""}`}
    >
      {/* Tab bar */}
      <div className="flex items-center h-[34px] bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)] shrink-0">
        <div className="flex items-center overflow-x-auto flex-1">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`group flex items-center gap-1.5 h-[34px] px-3 text-[12px] cursor-pointer border-r border-[var(--color-border-subtle)] transition-colors shrink-0 ${
                s.id === activeId
                  ? "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border-b-2 border-b-[var(--color-brand)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  s.status === "running"
                    ? "bg-[var(--status-running-text)]"
                    : s.status === "exited"
                      ? "bg-[var(--status-stopped-text)]"
                      : "bg-[var(--status-idle-text)]"
                }`}
              />
              <span className="max-w-[140px] truncate">{s.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  kill(s.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--color-bg-overlay)] rounded transition-opacity"
                aria-label="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <IconButton size="sm" onClick={() => createSession()} disabled={creating} className="ml-1">
            <Plus size={14} />
          </IconButton>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 pr-2">
          <IconButton size="sm" title="Split horizontal" active={splitMode === "h"} onClick={() => setSplitMode(splitMode === "h" ? "none" : "h")}>
            <Rows2 size={13} />
          </IconButton>
          <IconButton size="sm" title="Split vertical" active={splitMode === "v"} onClick={() => setSplitMode(splitMode === "v" ? "none" : "v")}>
            <Columns2 size={13} />
          </IconButton>
          <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
          <IconButton size="sm" title="Search" active={searchOpen} onClick={() => setSearchOpen(!searchOpen)}>
            <Search size={13} />
          </IconButton>
          <IconButton size="sm" title="Copy selection" onClick={handleCopy}>
            <Copy size={13} />
          </IconButton>
          <IconButton size="sm" title="Paste" onClick={handlePaste}>
            <Clipboard size={13} />
          </IconButton>
          <span className="w-px h-4 bg-[var(--color-border)] mx-1" />
          <IconButton size="sm" title="Restart session" onClick={() => activeId && useTerminal.getState().restart(activeId, 80, 24)}>
            <RotateCw size={13} />
          </IconButton>
          <IconButton size="sm" title="Terminate session" onClick={handleKill} disabled={!activeId}>
            <Trash2 size={13} />
          </IconButton>
          <IconButton size="sm" title={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </IconButton>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 h-8 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] shrink-0">
          <Search size={13} className="text-[var(--color-text-muted)]" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchAddonRef.current) {
                  searchQuery && searchAddonRef.current.findNext(searchQuery);
                }
              }
              if (e.key === "Escape") setSearchOpen(false);
            }}
            placeholder="Search terminal output…"
            className="flex-1 h-6 bg-transparent text-[12px] font-mono text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <IconButton size="sm" onClick={() => setSearchOpen(false)}>
            <X size={12} />
          </IconButton>
        </div>
      )}

      {/* Terminal area */}
      <div className={`flex-1 overflow-hidden ${splitMode === "h" ? "flex flex-col" : splitMode === "v" ? "flex flex-row" : ""}`}>
        {visibleSessions.map((id, i) => (
          <div
            key={id}
            className={`${splitMode === "h" ? "flex-1 border-b border-[var(--color-border)]" : splitMode === "v" ? "flex-1 border-r border-[var(--color-border)]" : "h-full"}`}
          >
            <TerminalView sessionId={id} />
            {i === 0 && splitMode !== "none" && sessions.length > 1 && (
              <div className="hidden" />
            )}
          </div>
        ))}
        {visibleSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--color-text-muted)]">
            <p className="text-[13px]">No terminal session</p>
            <button
              onClick={() => createSession()}
              className="flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium rounded-[var(--radius-sm)] bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] transition-colors cursor-pointer"
            >
              <Plus size={14} /> New Terminal
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmKill}
        title="Terminate session?"
        message={`Session ${activeSession?.title ?? ""} appears to be running. Terminating will send SIGKILL to its processes.`}
        confirmLabel="Terminate"
        danger
        onConfirm={() => activeId && kill(activeId)}
        onCancel={() => setConfirmKill(false)}
      />
    </div>
  );
}
