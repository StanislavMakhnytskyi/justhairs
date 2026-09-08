import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { formatDateTime } from "@/lib/format";
import { getServiceBySlug } from "@/lib/queries";
import { LoginForm } from "./LoginForm";

/** "Coloring · Thu 10:00" if the user was sent here mid-booking, else null. */
async function bookingSummary(next?: string): Promise<string | null> {
  if (!next || !next.startsWith("/book")) return null;
  const q = new URLSearchParams(next.split("?")[1] ?? "");
  const slug = q.get("service");
  if (!slug) return null;
  const service = await getServiceBySlug(slug);
  if (!service) return null;
  const time = q.get("time");
  const when = time
    ? ` · ${formatDateTime(time, { weekday: "short", month: "short" })}`
    : "";
  return `${service.name}${when}`;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const summary = await bookingSummary(next);

  return (
    <AppShell>
      <TopBar title="Sign in" />
      <div className="flex flex-1 flex-col px-gutter py-6">
        <h1 className="text-title text-text-primary">Sign in to continue</h1>
        <p className="mt-1 text-body text-text-secondary">
          Your details are saved so your next booking takes seconds.
        </p>
        {summary && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-border-strong bg-surface-card p-3">
            <p className="text-caption text-text-secondary">Booking</p>
            <p className="text-label font-bold text-text-primary">{summary}</p>
          </div>
        )}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-caption text-text-secondary">
          By continuing you agree to our{" "}
          <a href="/terms" className="font-bold text-link underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="font-bold text-link underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </AppShell>
  );
}
