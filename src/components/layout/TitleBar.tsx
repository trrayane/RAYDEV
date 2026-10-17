import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEnvironment } from "../../store/environment";

export function TitleBar() {
  const status = useEnvironment((s) => s.status);
  const selected = useEnvironment((s) => s.selectedDistro);
  const distro =
    status?.distros.find((d) => d.name === selected) ??
    status?.distros.find((d) => d.isDefault);
  const running = distro?.state === "Running";

  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-8 bg-[var(--color-bg-base)] border-b border-[var(--color-border-subtle)] px-0 shrink-0"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 pl-3 select-none">
        <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--color-brand)]">
          RAYDEV
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] tracking-[0.04em]">
          NeoShell
        </span>
      </div>

      <div data-tauri-drag-region className="flex-1 text-center text-[11px] text-[var(--color-text-muted)] select-none">
        {selected ? `${selected} — WSL 2 Dev Environment` : "RAYDEV"}
      </div>

      <div className="flex items-center gap-1 pr-0">
        {status?.installed !== false && (
          <div className="flex items-center gap-1.5 mr-3 px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${running ? "bg-[var(--status-running-text)] animate-pulse-dot" : "bg-[var(--status-idle-text)]"}`}
            />
            <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">
              WSL {running ? "Running" : "Stopped"}
            </span>
          </div>
        )}
        <button
          onClick={() => win.minimize()}
          className="w-11 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-11 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => win.close()}
          className="w-11 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-brand)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
