// Salon-clock helpers across Ireland's 2027 DST changes (spring forward Sun
// 28 Mar 01:00 UTC, fall back Sun 31 Oct 01:00 UTC). Pure functions, no network.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToDay,
  dayTimeGrid,
  nextOpenDates,
  openTodayLabel,
  parseDay,
  salonDayString,
  salonLocalToDate,
  validDay,
  validTime,
  weekdayOf,
} from "../../src/lib/salon.ts";

describe("URL param validators", () => {
  test("validDay accepts real days only", () => {
    assert.equal(validDay("2026-02-28"), "2026-02-28");
    assert.equal(validDay("2028-02-29"), "2028-02-29");
    for (const bad of ["banana", "2026-02-30", "2026-13-01", "2026-2-3", "", null, undefined]) {
      assert.equal(validDay(bad), null, String(bad));
    }
  });
  test("validTime accepts parseable instants only", () => {
    assert.equal(validTime("2027-03-30T09:00:00.000Z"), "2027-03-30T09:00:00.000Z");
    assert.equal(validTime("banana"), null);
    assert.equal(validTime(null), null);
  });
});

const OPEN = [2, 3, 4, 5, 6]; // Tue–Sat

describe("salonDayString", () => {
  test("is the Dublin calendar day, not the UTC one", () => {
    // Still GMT: 23:30Z is 23:30 local.
    assert.equal(salonDayString(new Date("2027-03-27T23:30:00Z")), "2027-03-27");
    // BST (+1) after the spring change: 23:30Z is already tomorrow in Dublin.
    assert.equal(salonDayString(new Date("2027-03-28T23:30:00Z")), "2027-03-29");
    // BST before the autumn change: 23:30Z on the 30th is 00:30 on the 31st.
    assert.equal(salonDayString(new Date("2027-10-30T23:30:00Z")), "2027-10-31");
    // GMT again after it.
    assert.equal(salonDayString(new Date("2027-10-31T23:30:00Z")), "2027-10-31");
  });
});

describe("calendar arithmetic", () => {
  test("addDaysToDay and weekdayOf ignore DST", () => {
    assert.equal(addDaysToDay("2027-03-27", 1), "2027-03-28");
    assert.equal(addDaysToDay("2027-03-27", 2), "2027-03-29");
    assert.equal(addDaysToDay("2027-10-30", 2), "2027-11-01");
    assert.equal(weekdayOf("2027-03-28"), 0); // Sunday
    assert.equal(weekdayOf("2027-10-31"), 0); // Sunday
  });

  test("parseDay keeps the calendar day in local fields", () => {
    const d = parseDay("2027-03-28");
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getDay()], [2027, 2, 28, 0]);
  });
});

describe("nextOpenDates", () => {
  test("walks across the spring change, skipping Sun/Mon", () => {
    const now = new Date("2027-03-26T12:00:00Z"); // Friday
    assert.deepEqual(nextOpenDates(OPEN, 6, now), [
      "2027-03-26",
      "2027-03-27",
      "2027-03-30",
      "2027-03-31",
      "2027-04-01",
      "2027-04-02",
    ]);
  });

  test("walks across the autumn change", () => {
    const now = new Date("2027-10-29T12:00:00Z"); // Friday
    assert.deepEqual(nextOpenDates(OPEN, 4, now), [
      "2027-10-29",
      "2027-10-30",
      "2027-11-02",
      "2027-11-03",
    ]);
  });

  test("late evening UTC on the night of the spring change is already the next Dublin day", () => {
    // 23:30Z Sat 27 Mar is 23:30 GMT: still Saturday. 23:30Z Sun 28 Mar is Mon 29 in BST.
    assert.equal(nextOpenDates(OPEN, 1, new Date("2027-03-27T23:30:00Z"))[0], "2027-03-27");
    assert.equal(nextOpenDates(OPEN, 1, new Date("2027-03-28T23:30:00Z"))[0], "2027-03-30");
  });
});

describe("openTodayLabel", () => {
  test("open until closing time, in BST", () => {
    // Tue 30 Mar 2027 (BST): 17:30 local = 16:30Z, 18:30 local = 17:30Z.
    assert.equal(openTodayLabel(OPEN, new Date("2027-03-30T16:30:00Z")), "Open today 9:00–18:00");
    assert.match(openTodayLabel(OPEN, new Date("2027-03-30T17:30:00Z")), /^Closed for today/);
  });

  test("closing is on the local hour right after the autumn change", () => {
    // Sat 30 Oct (still BST): 17:59 local = 16:59Z open, 18:00 local = 17:00Z closed.
    assert.equal(openTodayLabel(OPEN, new Date("2027-10-30T16:59:00Z")), "Open today 9:00–18:00");
    assert.match(openTodayLabel(OPEN, new Date("2027-10-30T17:00:00Z")), /^Closed for today/);
    // Tue 2 Nov (GMT): 17:59Z is 17:59 local, 18:00Z is closing.
    assert.equal(openTodayLabel(OPEN, new Date("2027-11-02T17:59:00Z")), "Open today 9:00–18:00");
    assert.match(openTodayLabel(OPEN, new Date("2027-11-02T18:00:00Z")), /^Closed for today/);
  });

  test("a closed weekday says so", () => {
    assert.equal(
      openTodayLabel(OPEN, new Date("2027-03-28T12:00:00Z")),
      "Closed today · open Tue–Sat",
    );
  });
});

describe("salonLocalToDate / dayTimeGrid", () => {
  test("09:00 local is 08:00Z in BST and 09:00Z in GMT", () => {
    assert.equal(salonLocalToDate("2027-03-30", "09:00").toISOString(), "2027-03-30T08:00:00.000Z");
    assert.equal(salonLocalToDate("2027-03-26", "09:00").toISOString(), "2027-03-26T09:00:00.000Z");
    assert.equal(salonLocalToDate("2027-10-29", "09:00").toISOString(), "2027-10-29T08:00:00.000Z");
    assert.equal(salonLocalToDate("2027-11-02", "09:00").toISOString(), "2027-11-02T09:00:00.000Z");
  });

  test("the grid has 18 half-hour slots on transition-adjacent days", () => {
    for (const day of ["2027-03-27", "2027-03-30", "2027-10-30", "2027-11-02"]) {
      assert.equal(dayTimeGrid(day).length, 18, day);
    }
  });
});
