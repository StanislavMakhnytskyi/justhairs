import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { sans, display } from "@/lib/fonts";
import { getSiteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "justhairs — book your look",
    template: "%s — justhairs",
  },
  description:
    "Book haircuts, colour and styling for men and women. Pick a service, a stylist, a time — done.",
  applicationName: "justhairs",
  openGraph: {
    siteName: "justhairs",
    type: "website",
    title: "justhairs — book your look",
    description:
      "Book haircuts, colour and styling for men and women. Pick a service, a stylist, a time — done.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        {/* First tab stop on every page. Each shell marks its content with
            id="main" (BookShell: the card, past the nav; AppShell/HomeShell:
            <main>), tabIndex -1 so focus actually moves there. It can land on
            the brand band, so the brand ring sits inside a focus-halo ring
            (box-shadow paints under the outline: halo | brand | halo). */}
        <a
          href="#main"
          className="sr-only rounded-[var(--radius-sm)] bg-surface-card text-label focus:px-4 focus:py-3 font-bold text-text-primary shadow-[var(--shadow-card)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand focus-visible:shadow-[0_0_0_6px_var(--focus-halo),var(--shadow-card)]"
        >
          Skip to content
        </a>
        {/* No root <ViewTransition>: it snapshotted the whole page on every
            router.push, and quick taps through the booking steps aborted the
            in-flight transition ("InvalidStateError: Transition was aborted")
            as an unhandled rejection. Pages animate themselves instead. */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}
