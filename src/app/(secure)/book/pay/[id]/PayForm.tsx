"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { payLater, saveGuestDetails, startCheckout } from "@/lib/actions/booking";
import { UNREACHABLE, clearGuestDraft, draftKey, isSettledError } from "./messages";

type Mode = "pay" | "later";
type Field = "name" | "email" | "phone";
type Values = Record<Field, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Mirrors `contactSchema` in src/lib/actions/booking.ts (trimmed lengths:
 *  name 1–120, email <= 200, phone 5–40), so the client never accepts what the
 *  server rejects or the other way round. Keep the two in step. */
function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const name = v.name.trim();
  const email = v.email.trim();
  const phone = v.phone.trim();
  if (!name) e.name = "Enter your name.";
  else if (name.length > 120) e.name = "Use 120 characters or fewer.";
  if (!EMAIL_RE.test(email) || email.length > 200) e.email = "Enter a valid email address.";
  if (phone.length < 5) e.phone = "Enter a phone number we can reach you on.";
  else if (phone.length > 40) e.phone = "Use 40 characters or fewer.";
  return e;
}

const ORDER: Field[] = ["name", "email", "phone"];
const EMPTY: Values = { name: "", email: "", phone: "" };

// A per-booking draft in sessionStorage: a reload, a back from Stripe or a
// failed save doesn't make the guest retype. Session-scoped and keyed by the
// appointment, so it never follows them to another booking. Storage can throw
// (private mode, quota, disabled) — every access is guarded.

function readDraft(id: string): Values | null {
  try {
    const raw = sessionStorage.getItem(draftKey(id));
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Values>;
    return {
      name: typeof d.name === "string" ? d.name : "",
      email: typeof d.email === "string" ? d.email : "",
      phone: typeof d.phone === "string" ? d.phone : "",
    };
  } catch {
    return null;
  }
}

function writeDraft(id: string, v: Values) {
  try {
    sessionStorage.setItem(draftKey(id), JSON.stringify(v));
  } catch {
    /* storage unavailable — the form still works, it just won't remember */
  }
}

const clearDraft = clearGuestDraft;

export function PayForm({
  appointmentId,
  priceLabel,
  showTestCard,
}: {
  appointmentId: string;
  priceLabel: string;
  /** Show the Stripe test-card hint (NEXT_PUBLIC_DEMO; see the pay page). */
  showTestCard: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Values>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, start] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Prefill after hydration (the server can't see sessionStorage), and only
  // fields the guest hasn't started typing in.
  useEffect(() => {
    const draft = readDraft(appointmentId);
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync from browser storage after hydration
    setValues((v) => ({
      name: v.name || draft.name,
      email: v.email || draft.email,
      phone: v.phone || draft.phone,
    }));
  }, [appointmentId]);

  const errors = useMemo(() => validate(values), [values]);
  const shown = (f: Field) =>
    touched[f] || submitAttempted ? errors[f] : undefined;

  function set(f: Field, value: string) {
    // Side effects stay out of the state updater (it must be pure; React may
    // call it twice in dev). `values` is current at event time.
    const next = { ...values, [f]: value };
    writeDraft(appointmentId, next);
    setValues(next);
    setFormError(null);
  }

  /** Show a refusal — unless it means the booking is already settled, in which
   *  case there is nothing to fix here: go to the confirmation. */
  function fail(message: string) {
    if (isSettledError(message)) {
      router.replace(`/book/confirmation/${appointmentId}`);
      return;
    }
    setFormError(message);
  }

  function submit(next: Mode) {
    setSubmitAttempted(true);
    setFormError(null);
    const found = validate(values);
    if (Object.keys(found).length) {
      const first = ORDER.find((f) => found[f]);
      const ref =
        first === "name" ? nameRef : first === "email" ? emailRef : phoneRef;
      ref.current?.focus();
      return;
    }
    setMode(next);
    start(async () => {
      // A rejected action (network drop, deploy mid-request) must not leave
      // the button spinning with nothing said — show the reachability error.
      try {
        const saved = await saveGuestDetails({ appointmentId, ...values });
        if (!saved.ok) {
          fail(saved.error);
          return;
        }
        if (next === "pay") {
          const res = await startCheckout(appointmentId);
          // replace() so browser-Back from Stripe doesn't return to this form.
          if (res.ok) window.location.replace(res.data.url);
          else fail(res.error);
        } else {
          const res = await payLater(appointmentId);
          if (res.ok) {
            clearDraft(appointmentId);
            router.push(`/book/confirmation/${appointmentId}`);
          } else fail(res.error);
        }
      } catch {
        setFormError(UNREACHABLE);
      }
    });
  }

  return (
    <form
      noValidate
      aria-label="Your details"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("pay");
      }}
    >
      <div className="flex flex-col gap-3">
        <TextField
          ref={nameRef}
          label="Full name"
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          spellCheck={false}
          required
          aria-required
          maxLength={120}
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={shown("name")}
        />
        <TextField
          ref={emailRef}
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-required
          maxLength={200}
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={shown("email")}
        />
        <TextField
          ref={phoneRef}
          label="Phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-required
          maxLength={40}
          placeholder="+353 …"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
          error={shown("phone")}
        />
      </div>

      {formError && (
        <p className="text-label font-medium text-error" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          block
          loading={pending && mode === "pay"}
          disabled={pending && mode === "later"}
        >
          Pay {priceLabel} now
        </Button>
        <Button
          type="button"
          variant="text"
          block
          loading={pending && mode === "later"}
          disabled={pending && mode === "pay"}
          onClick={() => submit("later")}
        >
          I&rsquo;ll pay after the service
        </Button>
      </div>

      <Divider />
      <p className="text-caption text-text-secondary">
        {showTestCard && (
          <>
            Card payments run in Stripe test mode &mdash; use card{" "}
            <span className="font-bold">4242 4242 4242 4242</span>, any future date and
            CVC.{" "}
          </>
        )}
        Choosing &ldquo;pay after&rdquo; holds your slot and you settle up at the salon.
      </p>
    </form>
  );
}
