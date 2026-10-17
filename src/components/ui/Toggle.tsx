interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-7 h-[14px] rounded-full transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        checked ? "bg-[var(--color-brand)]" : "bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
      }`}
    >
      <span
        className={`absolute top-[1px] w-[10px] h-[10px] rounded-full bg-white transition-transform duration-150 ${
          checked ? "translate-x-[15px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}
