import { SALON_TZ } from "./salon";

export { SALON_TZ };

type TimeInput = string | number | Date;

export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatSlotTime(t: TimeInput): string {
  return new Date(t).toLocaleTimeString("en-IE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SALON_TZ,
  });
}

export function formatDateTime(
  t: TimeInput,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Date(t).toLocaleString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: SALON_TZ,
    ...opts,
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
