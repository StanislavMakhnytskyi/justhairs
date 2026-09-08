"use client";

import { cn } from "@/lib/cn";

/** An on/off switch. Pair with a `<span id>` and pass `aria-labelledby`. */
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  ...rest
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
} & Pick<React.AriaAttributes, "aria-label" | "aria-labelledby" | "aria-describedby">) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-[var(--radius-pill)] transition-colors duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:opacity-50",
        checked ? "bg-brand" : "bg-border-strong",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] transition-transform duration-150 ease-[var(--ease-out)]",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
