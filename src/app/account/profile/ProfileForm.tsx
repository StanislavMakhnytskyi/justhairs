"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Divider } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { updateProfile, signOut } from "@/lib/actions/profile";
import type { Profile } from "@/lib/supabase/types";

export function ProfileForm({
  profile,
  staff,
}: {
  profile: Profile;
  staff: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    birthday: profile.birthday ?? "",
    preferred_staff_id: profile.preferred_staff_id ?? "",
    email_notif: profile.notification_prefs?.email ?? true,
    sms_notif: profile.notification_prefs?.sms ?? false,
  });

  function save(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    start(async () => {
      await updateProfile({
        full_name: form.full_name || undefined,
        phone: form.phone,
        birthday: form.birthday,
        preferred_staff_id: form.preferred_staff_id || null,
        notification_prefs: { email: form.email_notif, sms: form.sms_notif },
      });
      setSaved(true);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField
        label="Name"
        value={form.full_name}
        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
      />
      <TextField label="Email" value={profile.email ?? ""} disabled />
      <TextField
        label="Phone"
        type="tel"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <TextField
        label="Birthday"
        type="date"
        value={form.birthday}
        onChange={(e) => setForm({ ...form, birthday: e.target.value })}
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-bold text-text-primary">Preferred stylist</span>
        <select
          className="h-12 rounded-[var(--radius-sm)] border border-border-strong bg-surface-card px-4 text-[15px] text-text-primary"
          value={form.preferred_staff_id}
          onChange={(e) => setForm({ ...form, preferred_staff_id: e.target.value })}
        >
          <option value="">No preference</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <Divider className="my-2" />

      <p className="text-[13px] font-bold text-text-primary">Notifications</p>
      <Toggle
        label="Email"
        checked={form.email_notif}
        onChange={(v) => setForm({ ...form, email_notif: v })}
      />
      <Toggle
        label="SMS"
        checked={form.sms_notif}
        onChange={(v) => setForm({ ...form, sms_notif: v })}
      />

      <Divider className="my-2" />

      <div className="flex items-center gap-2 text-[13px] text-text-secondary">
        <CheckCircle2 size={16} className="text-success" />
        {profile.phone_verified ? "Phone verified" : "Signed in"}
      </div>
      <ThemeToggle />

      {saved && <p className="text-[13px] text-success">Saved.</p>}
      <Button type="submit" block disabled={pending}>
        Save changes
      </Button>
      <Button
        type="button"
        variant="text"
        block
        onClick={() =>
          start(async () => {
            await signOut();
            router.push("/");
            router.refresh();
          })
        }
      >
        Sign out
      </Button>
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between">
      <span className="text-[14px] text-text-primary">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[var(--brand)]"
      />
    </label>
  );
}
