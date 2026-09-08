import { redirect } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { getCatalog, getCurrentProfile } from "@/lib/queries";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const [profile, { staff }] = await Promise.all([getCurrentProfile(), getCatalog()]);
  if (!profile) redirect("/login?next=/account/profile");

  return (
    <div>
      <TopBar title="Profile" />
      <div className="p-gutter">
        <ProfileForm
          profile={profile}
          staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
