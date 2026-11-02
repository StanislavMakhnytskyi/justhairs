import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";
import { ApplyTheme } from "./ApplyTheme";

/**
 * What `notFound()` on the pay / confirmation pages renders (a real HTTP 404 —
 * there is deliberately no loading.tsx above these pages, which would stream
 * a 200 first). It covers an unknown id, a link opened in another browser (no
 * hold cookie), a hold released after 30 minutes, and a cancelled booking —
 * one honest message for all of them, without saying which.
 */
export default function BookingNotFound() {
  return (
    <BookShell>
      <ApplyTheme />
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-gutter py-12 text-center">
        <h1 className="text-title text-text-primary">This booking is no longer held</h1>
        <p className="max-w-[34ch] text-body text-text-secondary">
          Unfinished bookings are released after a while, and a booking link only opens in the
          browser it was made in. If you finished paying, check that browser for your
          confirmation code.
        </p>
        <Button href="/book">Book again</Button>
        <Button href="/" variant="text">
          Back to home
        </Button>
      </div>
    </BookShell>
  );
}
