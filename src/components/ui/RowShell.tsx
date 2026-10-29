import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { LinkPendingBar } from "./LinkPendingBar";

/**
 * Shared shell for the app's tappable list rows (services, stylists).
 *
 * Printed-list language: a row is a line on the card, separated from the next
 * by a dotted rule — no box around it. Selected fills the line with the brand
 * tint and drops the rule; the trailing indicator says what the row does:
 *   selected            → filled brand check
 *   link (href)         → chevron (navigates)
 *   select (onClick)    → hollow ring (pick one), or `end` if provided
 *   static              → `end` or nothing
 */
const shell =
  "relative -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 overflow-hidden rounded-[var(--radius-sm)] border-b-4 border-dotted px-2 py-3 text-left transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] last:border-b-transparent";
const interactive =
  "hover:bg-surface-sunken motion-safe:active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2";

function RowEnd({
  selected,
  href,
  onClick,
  end,
}: {
  selected?: boolean;
  href?: string;
  onClick?: unknown;
  end?: React.ReactNode;
}) {
  if (selected)
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-text-on-brand">
        <Check size={15} strokeWidth={3} aria-hidden />
      </span>
    );
  if (end !== undefined && end !== null && end !== false) return <>{end}</>;
  if (href)
    return (
      <ChevronRight size={18} className="shrink-0 text-text-tertiary" aria-hidden />
    );
  if (onClick)
    return (
      <span className="h-5 w-5 shrink-0 rounded-full border-2 border-border-strong" />
    );
  return null;
}

export function RowShell({
  selected,
  href,
  onClick,
  end,
  className,
  children,
}: {
  selected?: boolean;
  href?: string;
  onClick?: () => void;
  /** Trailing content when the row is neither selected nor a link. */
  end?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    shell,
    (href || onClick) && interactive,
    selected ? "border-transparent bg-brand-subtle" : "border-border-default",
    className,
  );

  const inner = (
    <>
      {children}
      <RowEnd selected={selected} href={href} onClick={onClick} end={end} />
    </>
  );

  if (href)
    return (
      <Link href={href} className={cls}>
        {inner}
        <LinkPendingBar />
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cls}>{inner}</div>;
}
