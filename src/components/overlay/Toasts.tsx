import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";
import { useUi } from "../../store/ui";

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const colors = {
  info: "var(--color-info)",
  success: "var(--status-running-text)",
  warning: "var(--status-warning-text)",
  error: "var(--color-error)",
};

export function Toasts() {
  const { toasts, dismissToast } = useUi();

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = icons[t.variant];
        return (
          <div
            key={t.id}
            className="flex items-start gap-2.5 min-w-[280px] max-w-[400px] px-4 py-3 bg-[var(--color-bg-overlay)] border border-[var(--color-border-accent)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] animate-slide-in-right pointer-events-auto"
          >
            <Icon size={15} style={{ color: colors[t.variant] }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[var(--color-text-primary)]">{t.title}</p>
              {t.message && (
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 break-words">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
