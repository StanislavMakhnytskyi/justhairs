import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { sans, display } from "@/lib/fonts";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "justhairs — book your look",
    template: "%s",
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
