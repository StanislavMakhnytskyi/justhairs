import { Children, Fragment, isValidElement } from "react";
import { Card, Divider } from "./primitives";

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
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-label text-text-secondary">{label}</span>
      <span
        className={
          strong
            ? "text-right text-subhead text-text-primary"
            : "text-right text-body font-medium text-text-primary"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** A card of SummaryRows, hairline-divided. */
export function SummaryList({
  children,
  footnote,
}: {
  children: React.ReactNode;
  footnote?: React.ReactNode;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <Card>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <Divider className="my-3" />}
          {row}
        </Fragment>
      ))}
      {footnote && (
        <p className="mt-4 text-caption text-text-secondary">{footnote}</p>
      )}
    </Card>
  );
}
