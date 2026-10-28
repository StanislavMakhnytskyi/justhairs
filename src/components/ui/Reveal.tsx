"use client";

import { useEffect, useRef } from "react";

/**
 * Fades + lifts its children in the first time they scroll into view.
 * Content already on screen at load is left alone (no flash), and nothing
 * happens under prefers-reduced-motion. `index` staggers siblings.
 */
export function Reveal({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already visible (or scrolled past): never hide it.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      if (el.dataset.reveal === "pending") el.dataset.reveal = "shown";
      return;
    }

    el.dataset.reveal = "pending";
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={index ? ({ "--i": index } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
