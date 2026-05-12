import { describe, expect, it } from "vitest";
import { getChunkTabDate, getWeekOfLabels } from "./dates";

describe("date helpers", () => {
  it("builds week labels in seven-day steps", () => {
    expect(getWeekOfLabels("2026-05-03").slice(0, 4)).toEqual([
      "Week of May 3",
      "Week of May 10",
      "Week of May 17",
      "Week of May 24"
    ]);
  });

  it("uses a placeholder when no start date is set", () => {
    expect(getWeekOfLabels("")[0]).toBe("Set start date");
  });

  it("formats tab dates", () => {
    expect(getChunkTabDate("2026-04-26")).toBe("April 26");
  });
});
