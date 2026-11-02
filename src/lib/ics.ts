/**
 * A single-event iCalendar (RFC 5545) file for "add to calendar". Pure and
 * import-free so the unit tests can load it with plain `node --test`.
 *
 * Times are written in UTC (`...Z`): every calendar app converts them to the
 * viewer's zone, and the salon's Europe/Dublin wall time comes out right on
 * both sides of a DST change without shipping a VTIMEZONE block.
 * `X-WR-TIMEZONE` hints the salon zone to apps that use it for display.
 *
 * Keep the content to what a calendar needs — service, time, place. No guest
 * name, email, phone or booking id (the UID is a hash, not the id).
 */
export type IcsEvent = {
  uid: string;
  start: Date;
  durationMin: number;
  summary: string;
  location: string;
  description?: string;
  /** DTSTAMP; injectable for tests. */
  now?: Date;
};

/** 20271031T093000Z */
export function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Fold content lines at 75 octets (RFC 5545 §3.1), continuation = CRLF + space. */
export function icsFold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + n > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcs(e: IcsEvent): string {
  const end = new Date(e.start.getTime() + e.durationMin * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//justhairs//booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-TIMEZONE:Europe/Dublin",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsUtc(e.now ?? new Date())}`,
    `DTSTART:${icsUtc(e.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    `LOCATION:${icsEscape(e.location)}`,
    ...(e.description ? [`DESCRIPTION:${icsEscape(e.description)}`] : []),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(icsFold).join("\r\n") + "\r\n";
}
