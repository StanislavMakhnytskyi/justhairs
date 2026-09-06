import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AppShell>
      <TopBar title="Sign in" />
      <div className="flex flex-1 flex-col px-6 py-6">
        <h1 className="text-[24px] font-bold tracking-tight text-text-primary">
          Sign in to continue
        </h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Your details are saved so your next booking takes seconds.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </AppShell>
  );
}
