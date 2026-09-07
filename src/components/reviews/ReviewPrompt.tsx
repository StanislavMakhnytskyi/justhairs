"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { StarRating } from "@/components/ui/StarRating";
import { submitReview } from "@/lib/actions/reviews";

export function ReviewPrompt({
  appointmentId,
  serviceName,
}: {
  appointmentId: string;
  serviceName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <Card className="mt-4">
        <p className="text-[14px] font-bold text-text-primary">Thanks for the feedback</p>
        <StarRating value={rating} className="mt-1" />
      </Card>
    );
  }

  function pick(n: number) {
    setRating(n);
    setOpen(true);
  }

  function send() {
    setError(null);
    start(async () => {
      const res = await submitReview({
        appointmentId,
        rating,
        comment: comment || undefined,
      });
      if (res.ok) {
        setOpen(false);
        setDone(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <Card className="mt-4">
        <p className="text-[15px] font-bold text-text-primary">How was your visit?</p>
        <p className="mt-0.5 text-[13px] text-text-secondary">{serviceName}</p>
        <StarRating value={rating} onChange={pick} size={28} className="mt-3" />
      </Card>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Leave a review">
        <StarRating value={rating} onChange={setRating} size={28} />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Anything you'd like to add? (optional)"
          className="mt-4 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface-card p-3 text-[14px] text-text-primary outline-none focus:border-brand"
        />
        {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
        <Button block className="mt-4" disabled={pending || rating === 0} onClick={send}>
          Submit review
        </Button>
      </BottomSheet>
    </>
  );
}
