"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/account";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/auth/callback?next=${encodeURIComponent(next)}`;

  async function google() {
    setBusy(true);
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
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

      {status && <p className="text-[13px] text-text-secondary">{status}</p>}
    </div>
  );
}
