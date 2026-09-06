import { BottomNav } from "@/components/layout/BottomNav";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[480px] bg-surface-app pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
