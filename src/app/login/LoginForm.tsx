"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    setBusy(true);
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) {
      setStatus(error.message);
    } else {
      setSent(true);
      setStatus(`We sent a 6-digit code to ${email}.`);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setStatus(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="mt-8 flex flex-col gap-4">
      <Button onClick={google} variant="white" block loading={busy}>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-[12px] text-text-tertiary">
        <Divider className="flex-1" /> or <Divider className="flex-1" />
      </div>

      {!sent ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <TextField
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" variant="outlined" block loading={busy}>
            Email me a code
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <TextField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <Button type="submit" block loading={busy} disabled={code.length < 6}>
            Verify and sign in
          </Button>
          <Button
            type="button"
            variant="text"
            block
            disabled={busy}
            onClick={() => {
              setSent(false);
              setCode("");
              setStatus(null);
            }}
          >
            Use a different email
          </Button>
        </form>
      )}

      {status && <p className="text-[13px] text-text-secondary">{status}</p>}
    </div>
  );
}
