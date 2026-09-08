export function StickyBar({
  children,
  label,
  value,
}: {
  children: React.ReactNode;
  /** Optional leading detail, e.g. a price. */
  label?: string;
  value?: string;
}) {
  return (
    <div className="sticky bottom-0 z-20 mt-auto border-t border-border-default bg-surface-app shadow-[var(--shadow-overlay)]">
      <div className="mx-auto flex min-h-[68px] max-w-[480px] items-center justify-between gap-3 px-gutter py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {(label || value) && (
          <div className="min-w-0">
            {label && (
              <p className="text-caption text-text-secondary">{label}</p>
            )}
            {value && (
              <p className="text-subhead text-text-primary">{value}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
