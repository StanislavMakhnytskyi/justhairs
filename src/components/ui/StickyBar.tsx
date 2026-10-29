/** The ticket's stub: a perforated strip pinned to the bottom of the card with
 *  a detail (usually the price) on one side and the action on the other. */
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
    <div className="sticky bottom-0 z-20 mt-auto bg-surface-card">
      <div className="cut" aria-hidden />
      <div className="flex min-h-[72px] items-center justify-between gap-3 px-gutter py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {(label || value) && (
          <div className="min-w-0">
            {label && <p className="text-caption text-text-secondary">{label}</p>}
            {value && <p className="text-heading tabular-nums text-text-primary">{value}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
