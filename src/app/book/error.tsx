"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";

/** The booking flow's own error boundary: same card, and a way back in that
 *  keeps the chosen service and stylist instead of dumping the visitor home. */
export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useSearchParams();
  useEffect(() => {
    console.error(error);
  }, [error]);

  const service = params.get("service");
  const restart = service ? `/book?service=${encodeURIComponent(service)}&step=specialist` : "/book";

  return (
    <BookShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-12 text-center">
        <h1 className="text-title text-text-primary">That didn&rsquo;t go through</h1>
        <p className="max-w-[32ch] text-body text-text-secondary">
          Something broke while loading this step. Your choices are safe — try again, or start
          this step over.
        </p>
        <Button onClick={reset}>Try again</Button>
        <Button href={restart} variant="text">
          Start this step over
        </Button>
        <Button href="/" variant="text">
          Back to home
        </Button>
      </div>
    </BookShell>
  );
}
