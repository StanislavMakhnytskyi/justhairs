"use client";

import { useEffect } from "react";
import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // KNOWN ISSUE (CODE_REVIEW.md #8): no monitoring/alerting integration
    // anywhere in the stack — a production error is invisible until a
    // customer reports it. Wire this to Sentry (or similar) before relying
    // on this app in production.
    console.error(error);
  }, [error]);

  return (
    <BookShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-12 text-center">
        <h1 className="text-title text-text-primary">Something went wrong</h1>
        <p className="max-w-[32ch] text-body text-text-secondary">
          That didn&rsquo;t load as expected. Try again in a moment.
        </p>
        <Button onClick={retry}>Try again</Button>
        <Button href="/" variant="text">
          Back to home
        </Button>
      </div>
    </BookShell>
  );
}
