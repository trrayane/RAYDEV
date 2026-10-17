import type { ButtonHTMLAttributes, ReactNode } from "react";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "w-6 h-6 p-1",
  md: "w-7 h-7 p-1.5",
  lg: "w-8 h-8 p-2",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  active?: boolean;
  children: ReactNode;
}

export function IconButton({
  size = "md",
  active = false,
  children,
  className = "",
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-[var(--radius-sm)] transition-all duration-100 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
        active
          ? "bg-[var(--color-brand-muted)] text-[var(--color-brand)]"
          : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
      } ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
