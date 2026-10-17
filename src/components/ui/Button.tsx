import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "xs" | "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] hover:shadow-[var(--shadow-glow-red)]",
  secondary:
    "bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-accent)]",
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]",
  danger:
    "bg-[var(--color-brand-muted)] text-[var(--color-brand)] border border-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white",
};

const sizeClasses: Record<Size, string> = {
  xs: "h-[22px] px-[6px] text-[10px] gap-1",
  sm: "h-[26px] px-2 text-[11px] gap-1.5",
  md: "h-[30px] px-3 text-[12px] gap-1.5",
  lg: "h-9 px-4 text-[13px] gap-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] font-medium tracking-[0.04em] transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
