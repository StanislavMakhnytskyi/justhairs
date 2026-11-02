"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * The card's header bar. Its title is the page's `h1` by default; a page that
 * renders its own `h1` (e.g. a service page) passes `titleAs="p"` so there is
 * exactly one per page.
 */
export function TopBar({
  title,
  onBack,
  right,
  titleAs: Title = "h1",
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
  titleAs?: "h1" | "p";
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border-default bg-surface-card px-gutter">
      <button
        type="button"
        aria-label="Back"
        onClick={onBack ?? (() => router.back())}
        className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2"
      >
        <ChevronLeft size={24} aria-hidden />
      </button>
      <Title className="flex-1 truncate text-subhead text-text-primary">{title}</Title>
      {right}
    </header>
  );
}
