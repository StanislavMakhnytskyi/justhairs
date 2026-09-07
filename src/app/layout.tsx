import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { ThemeScript } from "@/components/theme/ThemeScript";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

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
    <html lang="en" className={`${dmSans.variable} h-full`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
