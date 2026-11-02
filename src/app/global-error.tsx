"use client";

import { useEffect } from "react";
import "./globals.css";
import { sans, display } from "@/lib/fonts";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

/**
 * Replaces the root layout when it fails, so it brings its own document,
 * stylesheet and fonts (tokens only — no raw colours). The theme is applied
 * from the same storage key ThemeScript uses; a failure there just leaves the
 * light theme.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
    try {
      let t = localStorage.getItem("justhairs-theme");
      if (!t || t === "system") {
        t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      document.documentElement.setAttribute("data-theme", t);
    } catch {
      /* keep the default theme */
    }
  }, [error]);

  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="min-h-full">
        <title>Something went wrong — justhairs</title>
        <main
          id="main"
          className="book-band flex min-h-dvh items-center justify-center px-3 py-3 sm:px-6"
        >
          <div className="flex w-full max-w-[34rem] flex-col items-center gap-4 bg-surface-card px-gutter py-16 text-center text-text-primary">
            <Logo />
            <h1 className="mt-4 text-title text-text-primary">Something went wrong</h1>
            <p className="max-w-[32ch] text-body text-text-secondary">
              The site didn&rsquo;t load as expected. Try again in a moment.
            </p>
            <Button onClick={retry}>Try again</Button>
          </div>
        </main>
      </body>
    </html>
  );
}
