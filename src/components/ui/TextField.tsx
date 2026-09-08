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
    const msgId = `${fieldId}-msg`;
    const message = error ?? hint;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={fieldId} className="text-label font-bold text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            "h-12 rounded-[var(--radius-sm)] border bg-surface-card px-4 text-body text-text-primary outline-none placeholder:text-text-tertiary focus-visible:outline-2 focus-visible:outline-offset-2",
            error
              ? "border-error focus-visible:outline-error"
              : "border-border-strong focus-visible:outline-brand",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? msgId : undefined}
          {...props}
        />
        {message && (
          <p
            id={msgId}
            className={cn(
              "text-caption",
              error ? "font-medium text-error" : "text-text-secondary",
            )}
          >
            {message}
          </p>
        )}
      </div>
    );
  },
);
