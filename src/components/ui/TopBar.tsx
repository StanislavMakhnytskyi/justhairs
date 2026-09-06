"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border-default bg-surface-app px-2">
      <button
        aria-label="Back"
        onClick={onBack ?? (() => router.back())}
        className="flex h-10 w-10 items-center justify-center rounded-full text-text-primary hover:bg-surface-sunken"
      >
        <ChevronLeft size={24} />
      </button>
      <h1 className="flex-1 truncate text-[16px] font-bold text-text-primary">{title}</h1>
      {right}
    </header>
  );
}
