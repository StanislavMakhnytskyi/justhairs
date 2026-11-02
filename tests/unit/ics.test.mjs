// The add-to-calendar file: valid iCalendar, UTC times that land on the right
// Dublin wall time across DST, escaped text, folded long lines, no PII fields.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildIcs, icsEscape, icsFold, icsUtc } from "../../src/lib/ics.ts";

const base = {
  uid: "abc123@justhairs",
  durationMin: 45,
  summary: "Men's haircut at justhairs",
  location: "14 Parnell Street, Dublin 1, Ireland",
  now: new Date("2027-03-01T10:00:00Z"),
};

describe("buildIcs", () => {
  test("one VEVENT with CRLF line endings and the required properties", () => {
    const ics = buildIcs({ ...base, start: new Date("2027-03-30T09:00:00Z") });
    assert.ok(ics.endsWith("\r\n"));
    const lines = ics.trimEnd().split("\r\n");
    assert.equal(lines[0], "BEGIN:VCALENDAR");
    assert.equal(lines.at(-1), "END:VCALENDAR");
    assert.equal(lines.filter((l) => l === "BEGIN:VEVENT").length, 1);
    for (const p of ["VERSION:2.0", "PRODID:", "UID:abc123@justhairs", "DTSTAMP:20270301T100000Z"]) {
      assert.ok(lines.some((l) => l.startsWith(p)), p);
    }
  });

  test("times are UTC: 10:00 Dublin in BST is 09:00Z, in GMT is 10:00Z", () => {
    const bst = buildIcs({ ...base, start: new Date("2027-03-30T09:00:00Z") });
    assert.match(bst, /DTSTART:20270330T090000Z/);
    assert.match(bst, /DTEND:20270330T094500Z/);
    const gmt = buildIcs({ ...base, start: new Date("2027-11-02T10:00:00Z") });
    assert.match(gmt, /DTSTART:20271102T100000Z/);
  });

  test("text is escaped and has no guest fields", () => {
    const ics = buildIcs({
      ...base,
      start: new Date("2027-03-30T09:00:00Z"),
      description: "Paid; see you, soon\nbye",
    });
    assert.match(ics, /LOCATION:14 Parnell Street\\, Dublin 1\\, Ireland/);
    assert.match(ics, /DESCRIPTION:Paid\\; see you\\, soon\\nbye/);
    assert.doesNotMatch(ics, /ATTENDEE|ORGANIZER|EMAIL|TEL/);
  });
});

describe("helpers", () => {
  test("icsUtc drops separators and millis", () => {
    assert.equal(icsUtc(new Date("2027-10-31T01:30:15.123Z")), "20271031T013015Z");
  });

  test("icsEscape handles backslashes first", () => {
    assert.equal(icsEscape("a\\b,c;d"), "a\\\\b\\,c\\;d");
  });

  test("icsEscape turns every newline form into \\n and strips control chars", () => {
    assert.equal(icsEscape("a\r\nb\rc\nd"), "a\\nb\\nc\\nd");
    assert.equal(icsEscape("a\u0000b\u0007c\u001bd\u007fe"), "abcde");
    assert.equal(icsEscape("tab\there"), "tab\there");
  });

  test("icsFold keeps every physical line within 75 octets", () => {
    const long = `DESCRIPTION:${"é".repeat(80)}`;
    const folded = icsFold(long);
    for (const line of folded.split("\r\n")) {
      assert.ok(new TextEncoder().encode(line).length <= 75, line);
    }
    assert.equal(folded.split("\r\n").map((l, i) => (i ? l.slice(1) : l)).join(""), long);
  });
});
