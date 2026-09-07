"use client";

import { useLinkStatus } from "next/link";

/**
 * Drop inside a <Link> whose container is `relative overflow-hidden`. Shows a
 * sweeping brand-coloured bar along the bottom edge while that navigation is in
 * flight, so a tap is acknowledged before the next page paints.
 */
export function LinkPendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
    >
      <span className="block h-full w-full origin-left bg-brand motion-safe:animate-indeterminate" />
    </span>
  );
}
