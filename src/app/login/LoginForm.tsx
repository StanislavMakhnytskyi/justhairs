"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

const SMS_ENABLED = process.env.NEXT_PUBLIC_SMS_ENABLED === "true";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    setBusy(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    setStatus(error ? error.message : `Check ${email} for a sign-in link.`);
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) setStatus(error.message);
    else {
      setOtpSent(true);
      setStatus("We sent you a 6-digit code.");
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: "sms",
    });
    setBusy(false);
    if (error) setStatus(error.message);
    else window.location.assign(next);
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <Button onClick={google} variant="white" block disabled={busy}>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <Divider className="flex-1" /> or <Divider className="flex-1" />
      </div>

      <form onSubmit={magicLink} className="flex flex-col gap-3">
        <TextField
          label="Email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="outlined" block disabled={busy}>
          Email me a sign-in link
        </Button>
      </form>

      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <Divider className="flex-1" /> or <Divider className="flex-1" />
      </div>

      {SMS_ENABLED ? (
        !otpSent ? (
          <form onSubmit={sendOtp} className="flex flex-col gap-3">
            <TextField
              label="Phone number"
              type="tel"
              required
              placeholder="+353 XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" variant="outlined" block disabled={busy}>
              Send code
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="flex flex-col gap-3">
            <TextField
              label="Verification code"
              inputMode="numeric"
              required
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button type="submit" block disabled={busy}>
              Verify and sign in
            </Button>
          </form>
        )
      ) : (
        <div className="rounded-[var(--radius-sm)] border border-border-default p-3">
          <p className="text-[13px] font-bold text-text-primary">Phone sign-in</p>
          <p className="mt-1 text-[12px] text-text-secondary">
            SMS sign-in is not configured for this demo. Add an SMS provider in Supabase
            Auth and set <code>NEXT_PUBLIC_SMS_ENABLED=true</code> to enable it.
          </p>
        </div>
      )}

      {status && <p className="text-[13px] text-text-secondary">{status}</p>}
    </div>
  );
}
