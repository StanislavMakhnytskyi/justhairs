"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { payLater, saveGuestDetails, startCheckout } from "@/lib/actions/booking";

type Mode = "pay" | "later";

export function PayForm({
  appointmentId,
  priceLabel,
}: {
  appointmentId: string;
  priceLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [pending, start] = useTransition();

  function submit(next: Mode) {
    setError(null);
    setMode(next);
    start(async () => {
      const saved = await saveGuestDetails({ appointmentId, name, email, phone });
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      if (next === "pay") {
        const res = await startCheckout(appointmentId);
        if (res.ok) window.location.href = res.data.url;
        else setError(res.error);
      } else {
        const res = await payLater(appointmentId);
        if (res.ok) router.push(`/book/confirmation/${appointmentId}`);
        else setError(res.error);
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("pay");
      }}
    >
      <div className="flex flex-col gap-3">
        <TextField
          label="Full name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder="+353 …"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {error && <p className="text-label text-error">{error}</p>}

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
