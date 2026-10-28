"use client";

import { useEffect, useId, useRef, useState } from "react";

// Must match the --animate-sheet-down / scrim-out duration in globals.css.
const EXIT_MS = 200;

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
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Stay mounted through the exit animation, then unmount.
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-[var(--scrim)] ${
          open ? "motion-safe:animate-scrim-in" : "motion-safe:animate-scrim-out"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={open ? undefined : true}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full max-w-[480px] rounded-t-[var(--radius-xl)] bg-surface-card p-gutter pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-overlay)] outline-none ${
          open ? "motion-safe:animate-sheet-up" : "motion-safe:animate-sheet-down"
        }`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border-strong" />
        {title && (
          <h2 id={titleId} className="mb-4 text-heading text-text-primary">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}
