"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";

/** Reads ?staff= so "Book" can skip straight to the date step with that
 *  stylist already chosen, instead of the generic specialist-picker flow. */
export function BookCta({ slug, priceLabel }: { slug: string; priceLabel: string }) {
  const params = useSearchParams();
  const staff = params.get("staff");
  const href = staff
    ? `/book?service=${slug}&staff=${staff}&step=date`
    : `/book?service=${slug}`;

  return (
    <StickyBar label="Price" value={priceLabel}>
      <Button href={href} className="shrink-0">
        Book
      </Button>
    </StickyBar>
  );
}
