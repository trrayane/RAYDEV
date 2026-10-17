import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", className = "", ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-7 px-2 bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded-[var(--radius-sm)] font-mono text-[12px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-brand)] focus:shadow-[0_0_0_2px_var(--color-brand-glow)] outline-none transition-all duration-150 ${
          variant === "search" ? "w-full" : ""
        } ${className}`}
        {...rest}
      />
    );
  }
);
Input.displayName = "Input";
