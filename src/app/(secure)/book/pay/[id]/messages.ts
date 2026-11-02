/** Shown when a server action rejects (network drop, server restart) rather
 *  than returning an error. Same wording as the booking flow. */
export const UNREACHABLE = "We couldn't reach the salon. Check your connection and try again.";

/** The booking-actions' "already paid" / "already settled" refusals: the guest
 *  has nothing left to do here, so the UI moves to the confirmation page. */
export function isSettledError(message: string): boolean {
  return /already (paid|settled)|was already paid/i.test(message);
}

/** sessionStorage key of the guest-details draft (PII), per appointment. */
export const draftKey = (id: string) => `jh_guest_${id}`;

/** Remove the draft; storage can throw (private mode), so never let it. */
export function clearGuestDraft(id: string): void {
  try {
    sessionStorage.removeItem(draftKey(id));
  } catch {
    /* ignore */
  }
}
