import { forwardRef, useId } from "react";
import { cn } from "@/lib/cn";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, hint, error, className, id, ...props }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-[13px] font-bold text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-12 rounded-[var(--radius-sm)] border bg-surface-card px-4 text-[15px] text-text-primary outline-none placeholder:text-text-tertiary focus:border-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
            error ? "border-error" : "border-border-strong",
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {(error || hint) && (
          <p className={cn("text-[12px]", error ? "text-error" : "text-text-secondary")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  },
);
