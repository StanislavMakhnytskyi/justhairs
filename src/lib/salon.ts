// Salon-wide constants that mirror supabase/seed.sql + app_settings.
// The salon runs on one clock regardless of where the server or visitor is.
export const SALON_TZ = "Europe/Dublin";
export const SALON_OPEN_HOUR = 9; // 09:00 local
export const SALON_CLOSE_HOUR = 18; // 18:00 local
export const SLOT_STEP_MIN = 30; // display grid step
/** How far ahead a slot can be booked, in days from today. Mirrors the window
 *  enforced in SQL (migration 0006) and in `src/lib/actions/booking.ts`. */
export const BOOKABLE_DAYS = 90;
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Swap for a real contact address before sharing publicly.
export const LEGAL_CONTACT = "hello@justhairs.example";

export const SALON = {
  name: "justhairs",
  addressLines: ["14 Parnell Street", "Dublin 1", "Ireland"],
  addressOneLine: "14 Parnell Street, Dublin 1, Ireland",
  lat: 53.35216,
  lon: -6.26109,
  instagram: "https://instagram.com",
  facebook: "https://facebook.com",
  instagramHandle: "@justhairs",
};

/** Convert a salon-local wall time (`dayStr` = yyyy-MM-dd, `hhmm` = HH:MM) to a Date. */
export function salonLocalToDate(dayStr: string, hhmm: string): Date {
  const guess = new Date(`${dayStr}T${hhmm}:00Z`); // provisional: treat as UTC
  const shown = new Date(
    guess.toLocaleString("sv-SE", { timeZone: SALON_TZ }).replace(" ", "T") + "Z",
  );
  return new Date(guess.getTime() + (guess.getTime() - shown.getTime()));
}

/**
 * All candidate start times for a day, as epoch millis, stepped by
 * SLOT_STEP_MIN from open to close. Rendering the full grid lets unavailable
 * slots show muted rather than disappear.
 */
export function dayTimeGrid(dayStr: string): number[] {
  const out: number[] = [];
  for (let h = SALON_OPEN_HOUR; h < SALON_CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP_MIN) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      out.push(salonLocalToDate(dayStr, `${hh}:${mm}`).getTime());
    }
  }
  return out;
}

/** The salon's calendar day (yyyy-MM-dd) at `now`, whatever the visitor's or server's zone. */
export function salonDayString(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: SALON_TZ });
}

/** Weekday (0 = Sunday) of a yyyy-MM-dd calendar day. Zone-independent. */
export function weekdayOf(dayStr: string): number {
  return new Date(`${dayStr}T00:00:00Z`).getUTCDay();
}

/** `dayStr` plus `n` calendar days (zone-independent, so DST never shifts it). */
export function addDaysToDay(dayStr: string, n: number): string {
  const d = new Date(`${dayStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * A yyyy-MM-dd calendar day as a Date whose *local* year/month/day match it
 * (noon, so a DST gap at midnight can't shift it). For calendar widgets that
 * read local fields (date-fns `format`, `getDay`). Never parses the string with
 * the `Date` constructor, which would read it in the visitor's zone.
 */
export function parseDay(dayStr: string): Date {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/** `dayStr` if it is a real yyyy-MM-dd calendar day (2026-02-30 is not), else null. */
export function validDay(dayStr: string | null | undefined): string | null {
  if (!dayStr || !/^\d{4}-\d{2}-\d{2}$/.test(dayStr)) return null;
  const d = parseDay(dayStr);
  const back = `${String(d.getFullYear()).padStart(4, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return back === dayStr ? dayStr : null;
}

/** `time` if it parses as an ISO instant, else null. */
export function validTime(time: string | null | undefined): string | null {
  if (!time) return null;
  return Number.isNaN(new Date(time).getTime()) ? null : time;
}

/** The salon's "today" as a calendar-widget Date (see `parseDay`). */
export function salonToday(now: Date = new Date()): Date {
  return parseDay(salonDayString(now));
}

/** The next `count` dates (yyyy-MM-dd) the salon is open, starting today (salon time). */
export function nextOpenDates(
  openWeekdays: number[],
  count: number,
  now: Date = new Date(),
): string[] {
  const out: string[] = [];
  const today = salonDayString(now);
  for (let i = 0; i < 30 && out.length < count; i++) {
    const day = addDaysToDay(today, i);
    if (openWeekdays.includes(weekdayOf(day))) out.push(day);
  }
  return out;
}

/** "Open today 9:00–18:00" / "Closed today · open Tue–Sat", on the salon's clock. */
export function openTodayLabel(
  openWeekdays: number[],
  now: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SALON_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const isOpenDay = openWeekdays.includes(weekdayOf(salonDayString(now)));
  if (isOpenDay && hour < SALON_CLOSE_HOUR) {
    return `Open today ${SALON_OPEN_HOUR}:00–${SALON_CLOSE_HOUR}:00`;
  }
  const days = [...new Set(openWeekdays)];
  if (!days.length) return "Closed today";
  if (isOpenDay) {
    // After closing: name the next open day ("tomorrow" only if it is).
    const today = salonDayString(now);
    for (let i = 1; i <= 7; i++) {
      const wd = weekdayOf(addDaysToDay(today, i));
      if (days.includes(wd)) {
        return `Closed for today · open again ${i === 1 ? "tomorrow" : WEEKDAY_LABELS[wd]}`;
      }
    }
  }
  return `Closed today · open ${contiguousLabel(days)}`;
}

/** "Tue–Sat 9:00–18:00" style summary from working-hour rows. */
export function summariseHours(
  rows: { weekday: number; start_time: string; end_time: string }[],
): { open: string; off: string } | null {
  if (!rows.length) return null;
  const byDay = new Map(rows.map((r) => [r.weekday, r]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const openDays = order.filter((d) => byDay.has(d));
  if (!openDays.length) return null;

  const t = (s: string) => s.slice(0, 5).replace(/^0/, "");
  const sample = byDay.get(openDays[0])!;
  const sameTimes = openDays.every(
    (d) =>
      byDay.get(d)!.start_time === sample.start_time &&
      byDay.get(d)!.end_time === sample.end_time,
  );

  const open = sameTimes
    ? `${contiguousLabel(openDays)} ${t(sample.start_time)}–${t(sample.end_time)}`
    : contiguousLabel(openDays);
  const off = order
    .filter((d) => !byDay.has(d))
    .map((d) => WEEKDAY_LABELS[d])
    .join(", ");
  return { open, off: off ? `${off} off` : "" };
}

function contiguousLabel(days: number[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const idx = days.map((d) => order.indexOf(d)).sort((a, b) => a - b);
  const parts: string[] = [];
  let runStart = idx[0];
  for (let i = 1; i <= idx.length; i++) {
    if (idx[i] !== idx[i - 1] + 1) {
      const a = WEEKDAY_LABELS[order[runStart]];
      const b = WEEKDAY_LABELS[order[idx[i - 1]]];
      parts.push(runStart === idx[i - 1] ? a : `${a}–${b}`);
      runStart = idx[i];
    }
  }
  return parts.join(", ");
}
