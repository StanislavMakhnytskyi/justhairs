"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { payLater, saveGuestDetails, startCheckout } from "@/lib/actions/booking";

type Mode = "pay" | "later";
type Field = "name" | "email" | "phone";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(v: Record<Field, string>): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (v.name.trim().length < 2) e.name = "Enter your full name.";
  if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (v.phone.replace(/\D/g, "").length < 7) e.phone = "Enter a valid phone number.";
  return e;
}

const ORDER: Field[] = ["name", "email", "phone"];

export function PayForm({
  appointmentId,
  priceLabel,
}: {
  appointmentId: string;
  priceLabel: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    phone: "",
  });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, start] = useTransition();

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const errors = useMemo(() => validate(values), [values]);
  const shown = (f: Field) =>
    touched[f] || submitAttempted ? errors[f] : undefined;

  function set(f: Field, value: string) {
    setValues((v) => ({ ...v, [f]: value }));
    setFormError(null);
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
      const saved = await saveGuestDetails({ appointmentId, ...values });
      if (!saved.ok) {
        setFormError(saved.error);
        return;
      }
      if (next === "pay") {
        const res = await startCheckout(appointmentId);
        if (res.ok) window.location.href = res.data.url;
        else setFormError(res.error);
      } else {
        const res = await payLater(appointmentId);
        if (res.ok) router.push(`/book/confirmation/${appointmentId}`);
        else setFormError(res.error);
      }
    });
  }

  return (
    <form
      noValidate
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
          autoComplete="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={shown("name")}
        />
        <TextField
          ref={emailRef}
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={shown("email")}
        />
        <TextField
          ref={phoneRef}
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
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
        Card payments run in Stripe test mode — use card{" "}
        <span className="font-bold">4242 4242 4242 4242</span>, any future date and
        CVC. Choosing &ldquo;pay after&rdquo; holds your slot and you settle up at
        the salon.
      </p>
    </form>
  );
}
