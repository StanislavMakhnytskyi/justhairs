// Salon-wide constants that mirror supabase/seed.sql + app_settings.
// The salon runs on one clock regardless of where the server or visitor is.
export const SALON_TZ = "Europe/Dublin";
export const SALON_OPEN_HOUR = 9; // 09:00 local
export const SALON_CLOSE_HOUR = 18; // 18:00 local
export const SLOT_STEP_MIN = 30; // display grid step
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

/** The next `count` dates (yyyy-MM-dd) the salon is open, starting today. */
export function nextOpenDates(openWeekdays: number[], count: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < 30 && out.length < count; i++) {
    if (openWeekdays.includes(d.getDay())) {
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate(),
        ).padStart(2, "0")}`,
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
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
