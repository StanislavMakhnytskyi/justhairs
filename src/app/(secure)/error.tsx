"use client";

import { useEffect } from "react";
import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";
import { ApplyTheme } from "./ApplyTheme";

/**
 * Error boundary for the pay and confirmation pages. Same card as the rest of
 * the booking. "Try again" re-runs the page (a payment may have landed in the
 * meantime); the fallback is a fresh booking. No useSearchParams here: it
 * would opt the boundary into client-side bailout for nothing.
 */
export default function SecureError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <BookShell>
      <ApplyTheme />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-12 text-center">
        <h1 className="text-title text-text-primary">We couldn&rsquo;t load your booking</h1>
        <p className="max-w-[34ch] text-body text-text-secondary">
          Something went wrong on our side. If you already paid, nothing is lost &mdash; try
          again in a moment and your booking will be here.
        </p>
        <Button onClick={retry}>Try again</Button>
        <Button href="/book" variant="text">
          Start a new booking
        </Button>
        {error.digest && (
          <p className="text-caption text-text-secondary">Reference: {error.digest}</p>
        )}
      </div>
    </BookShell>
  );
}
