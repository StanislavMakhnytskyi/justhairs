"use client";

import { useEffect } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-neutral-950/40"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-[480px] rounded-t-[var(--radius-xl)] bg-surface-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-overlay)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        {title && (
          <h2 className="mb-4 text-[19px] font-bold tracking-tight text-text-primary">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
