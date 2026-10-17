import { useEffect, useState } from "react";
import {
  RefreshCw,
  Terminal,
  Star,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useEnvironment, distroStateClass } from "../../store/environment";
import { useTerminal } from "../../store/terminal";
import { useSettings } from "../../store/settings";
import { useUi } from "../../store/ui";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api, collectDiagnostics } from "../../lib/api";
import { wslLinuxHome } from "../../lib/wslpath";

export function EnvironmentPanel() {
  const {
    status,
    loading,
    error,
    selectedDistro,
    diagnostics,
    diagLoading,
    refresh,
    selectDistro,
  } = useEnvironment();
  const openSession = useTerminal((s) => s.openSession);
  const updateSettings = useSettings((s) => s.update);
  const defaultDistro = useSettings((s) => s.settings.defaultDistro);
  const pushToast = useUi((s) => s.pushToast);
  const [wslVer, setWslVer] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    api.wsl.version().then(setWslVer).catch(() => setWslVer(null));
  }, []);

  const launchTerminal = async (distro: string) => {
    try {
      const home = await wslLinuxHome(distro);
      await openSession(distro, home, 80, 24);
    } catch (e) {
      pushToast({ variant: "error", title: "Launch failed", message: String(e) });
    }
  };

  const runDiag = async (distro: string) => {
    useEnvironment.setState({ diagLoading: distro });
    const result = await collectDiagnostics(distro);
    useEnvironment.setState((st) => ({
      diagnostics: { ...st.diagnostics, [distro]: result },
      diagLoading: null,
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-panel)] overflow-auto">
      <div className="flex items-center justify-between h-9 px-4 border-b border-[var(--color-border-subtle)] shrink-0 sticky top-0 bg-[var(--color-bg-panel)] z-10">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
          Environments
        </span>
        <Button size="xs" icon={<RefreshCw size={12} className={loading ? "animate-spin-slow" : ""} />} onClick={refresh} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="p-4 space-y-4 max-w-[720px]">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-[var(--radius-md)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] text-[12px] text-[var(--status-warning-text)]">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">WSL issue</p>
              <p className="text-[11px] mt-0.5 opacity-90">{error}</p>
            </div>
          </div>
        )}

        {wslVer && (
          <div className="p-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)]">
            <div className="flex items-center gap-2 mb-1">
              <Info size={13} className="text-[var(--color-info)]" />
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
                WSL Version
              </span>
            </div>
            <pre className="text-[11px] font-mono text-[var(--color-text-secondary)] whitespace-pre-wrap m-0">
              {wslVer}
            </pre>
          </div>
        )}

        {!status?.installed && !loading && !error && (
          <div className="p-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] text-[12px] text-[var(--color-text-secondary)]">
            WSL is not available. Install it from PowerShell:{" "}
            <code className="text-[var(--color-code)]">wsl --install</code>, then restart.
          </div>
        )}

        {status?.distros.map((d) => {
          const diag = diagnostics[d.name];
          const isSel = selectedDistro === d.name;
          const isManaged = /docker-desktop/i.test(d.name);
          return (
            <div
              key={d.name}
              className={`rounded-[var(--radius-md)] border transition-colors ${
                isSel
                  ? "border-[var(--color-border-active)] bg-[var(--color-bg-surface)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-surface)]"
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <div className="flex items-center gap-2">
                  {d.isDefault && <Star size={13} className="text-[var(--color-brand)]" fill="currentColor" />}
                  <span className="text-[13px] font-semibold font-mono">{d.name}</span>
                  <span className={`px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.08em] rounded-[var(--radius-xs)] border ${distroStateClass(d.state)}`}>
                    {d.state}
                  </span>
                  <Badge variant="count">WSL{d.version}</Badge>
                  {defaultDistro === d.name && <Badge variant="ready">App default</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  {!isManaged && (
                    <>
                      <Button size="xs" variant="ghost" onClick={() => selectDistro(d.name)} disabled={isSel}>
                        {isSel ? "Selected" : "Select"}
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        icon={<Terminal size={12} />}
                        onClick={() => launchTerminal(d.name)}
                      >
                        Terminal
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => updateSettings({ defaultDistro: d.name })}>
                        Set default
                      </Button>
                    </>
                  )}
                  {isManaged && (
                    <span className="text-[10px] text-[var(--color-text-muted)] italic">
                      Managed system distribution — controls hidden
                    </span>
                  )}
                </div>
              </div>

              {isSel && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      Diagnostics
                    </span>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={diagLoading === d.name ? <Loader2 size={12} className="animate-spin-slow" /> : <RefreshCw size={12} />}
                      onClick={() => runDiag(d.name)}
                      disabled={diagLoading === d.name}
                    >
                      {diagLoading === d.name ? "Running…" : "Run checks"}
                    </Button>
                  </div>
                  {diag ? (
                    <div className="space-y-1 font-mono text-[11px]">
                      {(
                        [
                          ["uname", "Kernel"],
                          ["osRelease", "OS"],
                          ["python3", "Python 3"],
                          ["git", "Git"],
                          ["gcc", "GCC"],
                        ] as const
                      ).map(([key, label]) => {
                        const val = diag[key];
                        const err = diag.errors[key];
                        return (
                          <div key={key} className="flex items-start gap-2">
                            {val ? (
                              <CheckCircle2 size={12} className="text-[var(--status-running-text)] mt-0.5 shrink-0" />
                            ) : (
                              <XCircle size={12} className="text-[var(--color-text-muted)] mt-0.5 shrink-0" />
                            )}
                            <span className="text-[var(--color-text-muted)] w-16 shrink-0">{label}</span>
                            <span className="text-[var(--color-text-secondary)] break-all">
                              {val
                                ? key === "osRelease"
                                  ? val.split("\n").find((l) => l.startsWith("PRETTY_NAME"))?.replace('PRETTY_NAME=', '').replace(/"/g, "") ?? val.slice(0, 80)
                                  : val.split("\n")[0]
                                : err
                                  ? `not available — ${err.includes("not found") ? "install with `apt install`" : err}`
                                  : "not found"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      Run checks to verify tools inside this distribution. Nothing is installed automatically.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Bootstrap checklist */}
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info size={13} className="text-[var(--color-info)]" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">
              Ubuntu bootstrap checklist (optional)
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mb-2">
            These commands are shown, not executed. Run them yourself in a terminal when ready.
          </p>
          <pre className="text-[11px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-bg-base)] rounded-[var(--radius-sm)] p-2 overflow-auto m-0">
{`sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential cmake git curl
sudo apt install -y python3-venv python3-pip
# Optional: Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash`}
          </pre>
        </div>
      </div>
    </div>
  );
}
