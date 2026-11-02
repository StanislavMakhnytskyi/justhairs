"use client";

import { useEffect, useState, useTransition } from "react";
import { clearGuestDraft } from "../../pay/[id]/messages";
import { useRouter } from "next/navigation";
import { Check, Copy, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Paid / booked: the guest-details draft (name, email, phone) has done its
 *  job, so drop it from sessionStorage. Renders nothing. */
export function ClearGuestDraft({ appointmentId }: { appointmentId: string }) {
  useEffect(() => {
    clearGuestDraft(appointmentId);
  }, [appointmentId]);
  return null;
}

/** Copy the confirmation code + print the card. Lives in the tear-off stub. */
export function CodeActions({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 print:hidden">
      <Button type="button" variant="text" size="md" className="-ml-4" onClick={copy}>
        {state === "copied" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {state === "copied" ? "Copied" : "Copy code"}
      </Button>
      <Button type="button" variant="text" size="md" onClick={() => window.print()}>
        <Printer size={16} aria-hidden />
        Print
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Confirmation code copied" : ""}
      </span>
      {state === "failed" && (
        <p role="alert" className="basis-full text-caption font-medium text-error">
          Couldn&rsquo;t copy &mdash; write the code down or take a screenshot.
        </p>
      )}
    </div>
  );
}

/** "Confirming your payment…": re-run the page (which re-checks the Stripe
 *  session) without a full reload. */
export function RefreshStatus() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button type="button" block loading={pending} onClick={() => start(() => router.refresh())}>
      {!pending && <RefreshCw size={18} aria-hidden />}
      Check payment status
    </Button>
  );
}
