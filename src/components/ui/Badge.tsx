import type { ReactNode } from "react";

type Variant = "running" | "ready" | "stopped" | "idle" | "warning" | "count";

const classes: Record<Variant, string> = {
  running:
    "bg-[var(--status-running-bg)] text-[var(--status-running-text)] border-[var(--status-running-border)]",
  ready:
    "bg-[var(--status-ready-bg)] text-[var(--status-ready-text)] border-[var(--status-ready-border)]",
  stopped:
    "bg-[var(--status-stopped-bg)] text-[var(--status-stopped-text)] border-[var(--status-stopped-border)]",
  idle: "bg-[var(--status-idle-bg)] text-[var(--status-idle-text)] border-[var(--status-idle-border)]",
  warning:
    "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
  count: "bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
};

export function Badge({
  variant = "idle",
  children,
  className = "",
}: {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.08em] rounded-[var(--radius-xs)] border ${classes[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
