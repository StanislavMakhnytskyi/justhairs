import { Children, isValidElement } from "react";

/** One printed line: label, a dotted leader, value. */
export function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-label text-text-secondary">{label}</span>
      <span
        aria-hidden
        className="min-w-4 flex-1 translate-y-[-3px] border-b-4 border-dotted border-border-strong"
      />
      <span
        className={
          strong
            ? "text-right text-heading tabular-nums text-text-primary"
            : "text-right text-body font-bold text-text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** The ticket's filled-in lines. No box — it sits directly on the paper. */
export function SummaryList({
  children,
  footnote,
}: {
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <div className="flex flex-col gap-5">
      {rows}
      {footnote && <p className="text-caption text-text-secondary">{footnote}</p>}
    </div>
  );
}
