"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

export function StarRating({
  value,
  onChange,
  size = 20,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const readOnly = !onChange;
  const shown = hover || value;

  return (
    <div
      className={cn("inline-flex gap-0.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={readOnly ? `Rated ${value} out of 5` : "Rating"}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          role={readOnly ? undefined : "radio"}
          aria-checked={readOnly ? undefined : value === n}
          className={cn(
            "rounded-full",
            !readOnly &&
              "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
          )}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => onChange?.(n)}
        >
          <Star
            size={size}
            className={n <= shown ? "fill-rating text-rating" : "text-border-strong"}
          />
        </button>
      ))}
    </div>
  );
}
