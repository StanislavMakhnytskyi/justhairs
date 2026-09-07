import { cn } from "@/lib/cn";

/**
 * justhairs wordmark. Set in the display face (never body copy), with a weight
 * shift between "just" and "hairs" and a rounded "j" badge.
 */
export function Logo({
  tone = "default",
  size = "md",
  className,
}: {
  tone?: "default" | "onBrand";
  size?: "md" | "lg";
  className?: string;
}) {
  const badge =
    tone === "onBrand"
      ? "bg-white text-brand"
      : "bg-brand text-white";
  const word = tone === "onBrand" ? "text-white" : "text-text-primary";

  const dims = size === "lg" ? "h-9 w-9 text-[22px]" : "h-7 w-7 text-[17px]";
  const wordSize = size === "lg" ? "text-[26px]" : "text-[20px]";

  return (
    <span
      className={cn("inline-flex select-none items-center gap-2", className)}
      aria-label="justhairs"
    >
      <span
        className={cn(
          "grid place-items-center rounded-[9px] font-display font-extrabold leading-none",
          dims,
          badge,
        )}
        aria-hidden
      >
        j
      </span>
      <span
        className={cn(
          "font-display lowercase leading-none tracking-[-0.045em]",
          wordSize,
          word,
        )}
        aria-hidden
      >
        <span className="font-semibold opacity-90">just</span>
        <span className="font-extrabold">hairs</span>
      </span>
    </span>
  );
}
