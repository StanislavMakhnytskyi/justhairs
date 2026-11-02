import { Children, cloneElement, isValidElement } from "react";

type RowProps = {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
  /** Set by `SummaryList`: render as a `dt`/`dd` pair inside its `dl`. */
  inList?: boolean;
};

/** One printed line: label, a dotted leader, value. Inside a `SummaryList` it
 *  is a description-list group (`div > dt + dd`, valid inside a `dl`); used on
 *  its own (e.g. the TicketPanel) it is plain text spans. */
export function SummaryRow({ label, value, strong, inList }: RowProps) {
  const Term = inList ? "dt" : "span";
  const Detail = inList ? "dd" : "span";
  return (
    <div className="flex items-baseline gap-2">
      {/* The leader lives INSIDE the term: a dl group may hold only dt/dd. */}
      <Term className="flex flex-1 items-baseline gap-2 text-label text-text-secondary">
        {label}
        <span
          aria-hidden
          className="min-w-4 flex-1 translate-y-[-3px] border-b-4 border-dotted border-border-default"
        />
      </Term>
      <Detail
        className={
          strong
            ? "text-right text-heading tabular-nums text-text-primary"
            : "text-right text-body font-bold text-text-primary"
        }
      >
        {value}
      </Detail>
    </div>
  );
}

/** The ticket's filled-in lines, as a description list. No box — it sits
 *  directly on the paper. */
export function SummaryList({
  children,
  footnote,
}: {
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  const rows = Children.toArray(children)
    .filter(isValidElement<RowProps>)
    .map((row) => cloneElement(row, { inList: true }));
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-5">{rows}</dl>
      {footnote && <p className="text-caption text-text-secondary">{footnote}</p>}
    </div>
  );
}
