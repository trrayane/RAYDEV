import { useEffect, useState } from "react";
import { useEnvironment } from "../../store/environment";
import { useTerminal } from "../../store/terminal";
import { useUi } from "../../store/ui";
import { Badge } from "../ui/Badge";

export function StatusBar() {
  const { status, selectedDistro } = useEnvironment();
  const sessions = useTerminal((s) => s.sessions);
  const activeId = useTerminal((s) => s.activeId);
  const projectRoot = useUi((s) => s.projectRoot);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const distro = status?.distros.find((d) => d.name === selectedDistro);
  const activeSession = sessions.find((s) => s.id === activeId);
  const aliveCount = sessions.filter((s) => s.status === "running").length;

  return (
    <div className="flex items-center justify-between h-7 px-3 bg-[var(--color-bg-base)] border-t border-[var(--color-border-subtle)] text-[11px] font-mono text-[var(--color-text-muted)] shrink-0 select-none">
      <div className="flex items-center gap-3">
        {distro ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                distro.state === "Running"
                  ? "bg-[var(--status-running-text)] animate-pulse-dot"
                  : "bg-[var(--status-idle-text)]"
              }`}
            />
            <span className="text-[var(--color-text-secondary)]">{distro.name}</span>
            <span>WSL{distro.version}</span>
          </div>
        ) : (
          <span>WSL not detected</span>
        )}
        {projectRoot && (
          <span className="text-[var(--color-text-secondary)] max-w-[300px] truncate">
            {projectRoot}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {activeSession && (
          <span className="text-[var(--color-text-secondary)]">
            {activeSession.status === "running"
              ? "bash"
              : `exit ${activeSession.exitCode ?? "?"}`}
          </span>
        )}
        <Badge variant="count">{aliveCount} term</Badge>
        <span>{clock}</span>
      </div>
    </div>
  );
}
