import { describe, expect, it } from "vitest";
import { addDays, bangkokDate, bangkokDayRange, isValidDateString } from "./date";

describe("bangkokDate", () => {
  it("rolls over to the next day at 17:00 UTC", () => {
    expect(bangkokDate(new Date("2026-10-24T16:59:59Z"))).toBe("2026-10-24");
    expect(bangkokDate(new Date("2026-10-24T17:00:00Z"))).toBe("2026-10-25");
  });
});

describe("bangkokDayRange", () => {
  it("spans Bangkok midnight to midnight in UTC", () => {
    expect(bangkokDayRange("2026-10-24")).toEqual({
      start: "2026-10-23T17:00:00.000Z",
      end: "2026-10-24T17:00:00.000Z",
    });
  });

  it("rejects malformed dates", () => {
    expect(() => bangkokDayRange("24-10-2026")).toThrow();
  });
});

describe("isValidDateString / addDays", () => {
  it("validates the YYYY-MM-DD format", () => {
    expect(isValidDateString("2026-10-24")).toBe(true);
    expect(isValidDateString("2026-13-40")).toBe(false);
    expect(isValidDateString("today")).toBe(false);
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-10-30", 6)).toBe("2026-11-05");
  });
});
