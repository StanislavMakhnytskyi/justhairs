import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

/** A labelled `<select>` matching `TextField` — same height, border and ring. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    { label, hint, error, className, id, children, ...props },
    ref,
  ) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-label font-bold text-text-primary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            className={cn(
              "h-12 w-full appearance-none rounded-[var(--radius-sm)] border bg-surface-card px-4 pr-10 text-body text-text-primary outline-none focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              error ? "border-error" : "border-border-strong",
              className,
            )}
            aria-invalid={!!error}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={16}
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
        {(error || hint) && (
          <p className={cn("text-caption", error ? "text-error" : "text-text-secondary")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
