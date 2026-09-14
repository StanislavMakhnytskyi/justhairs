"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // KNOWN ISSUE (CODE_REVIEW.md #8): no monitoring/alerting integration
    // anywhere in the stack — a production error is invisible until a
    // customer reports it. Wire this to Sentry (or similar) before relying
    // on this app in production.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 px-gutter text-center">
      <h1 className="text-title text-text-primary">Something went wrong</h1>
      <p className="text-body text-text-secondary">
        That didn&rsquo;t load as expected. Try again in a moment.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Button href="/" variant="text">
        Back to home
      </Button>
    </div>
  );
}
