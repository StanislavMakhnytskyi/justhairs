// openTodayLabel derives its "open Tue–Sat" / "open again <day>" wording from
// the salon's open weekdays instead of hard-coding them.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { openTodayLabel } from "../../src/lib/salon.ts";

describe("openTodayLabel wording", () => {
  test("closed-day summary follows openWeekdays", () => {
    const sunday = new Date("2027-03-28T12:00:00Z");
    assert.equal(openTodayLabel([1, 2, 3, 4, 5], sunday), "Closed today · open Mon–Fri");
    assert.equal(openTodayLabel([2, 3, 4, 5, 6], sunday), "Closed today · open Tue–Sat");
    assert.equal(openTodayLabel([2, 4, 6], sunday), "Closed today · open Tue, Thu, Sat");
    assert.equal(openTodayLabel([6, 2, 3, 2, 4, 5], sunday), "Closed today · open Tue–Sat");
    assert.equal(openTodayLabel([], sunday), "Closed today");
  });

  test("after closing it names the next open day, 'tomorrow' only when it is", () => {
    // Sat 27 Mar 2027 (GMT) 18:30 local: Sun and Mon are closed -> Tue.
    const satEvening = new Date("2027-03-27T18:30:00Z");
    assert.equal(
      openTodayLabel([2, 3, 4, 5, 6], satEvening),
      "Closed for today · open again Tue",
    );
    // Tue 30 Mar 2027 (BST) 18:30 local = 17:30Z: Wednesday is open.
    assert.equal(
      openTodayLabel([2, 3, 4, 5, 6], new Date("2027-03-30T17:30:00Z")),
      "Closed for today · open again tomorrow",
    );
  });
});
