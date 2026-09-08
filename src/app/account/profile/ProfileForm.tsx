"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SelectField } from "@/components/ui/SelectField";
import { Switch } from "@/components/ui/Switch";
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
        notification_prefs: { email: form.email_notif, sms: false },
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

      <SelectField
        label="Preferred stylist"
        value={form.preferred_staff_id}
        onChange={(e) => setForm({ ...form, preferred_staff_id: e.target.value })}
      >
        <option value="">No preference</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </SelectField>

      <Divider className="my-2" />

      <div className="flex items-center justify-between gap-3">
        <span id="email-reminders" className="text-body text-text-primary">
          Email reminders
        </span>
        <Switch
          aria-labelledby="email-reminders"
          checked={form.email_notif}
          onChange={(v) => setForm({ ...form, email_notif: v })}
        />
      </div>

      <Divider className="my-2" />

      <div className="flex items-center gap-2 text-label text-text-secondary">
        <CheckCircle2 size={16} className="text-success" />
        Signed in{profile.email ? ` as ${profile.email}` : ""}
      </div>
      <ThemeToggle />

      {saved && <p className="text-label text-success">Saved.</p>}
      <Button type="submit" block loading={pending}>
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
