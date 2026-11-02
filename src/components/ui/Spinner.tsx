import { cn } from "@/lib/cn";

/** Inline activity indicator. Inherits `currentColor`. Spins only under
 *  `motion-safe`; with reduced motion it is a still arc (the owning control
 *  carries `aria-busy`, so the state never depends on the movement). */
export function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn("shrink-0 motion-safe:animate-spin", className)}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
