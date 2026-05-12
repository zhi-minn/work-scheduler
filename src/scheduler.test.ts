import { describe, expect, it } from "vitest";
import { buildSchedule, TOTAL_HOURS } from "./scheduler";

describe("buildSchedule", () => {
  it("evenly distributes an empty schedule across 11 weeks", () => {
    const schedule = buildSchedule([]);
    const suggestions = schedule.weeks.map((week) => week.suggestedHours);

    expect(schedule.plannedHours).toBe(TOTAL_HOURS);
    expect(suggestions).toEqual([36, 36, 36, 36, 36, 36, 36, 36, 24, 24, 24]);
  });

  it("distributes remaining hours across blank weeks after entered hours", () => {
    const schedule = buildSchedule(["48", "", "24", "", "", "", "", "", "48", "", ""]);
    const suggestions = schedule.weeks
      .filter((week) => week.status === "suggested")
      .map((week) => week.suggestedHours);

    expect(schedule.enteredHours).toBe(120);
    expect(schedule.plannedHours).toBe(360);
    expect(suggestions).toEqual([36, 36, 36, 36, 24, 24, 24, 24]);
  });

  it("allows non-multiples of 12 and rounds suggestions up to 12-hour blocks", () => {
    const schedule = buildSchedule(["13"]);
    const suggestions = schedule.weeks
      .filter((week) => week.status === "suggested")
      .map((week) => week.suggestedHours);

    expect(schedule.hasInvalidInputs).toBe(false);
    expect(schedule.enteredHours).toBe(13);
    expect(schedule.suggestedHours).toBe(348);
    expect(schedule.plannedHours).toBe(361);
    expect(schedule.overageHours).toBe(1);
    expect(suggestions).toEqual([36, 36, 36, 36, 36, 36, 36, 36, 36, 24]);
  });

  it("marks negative values as invalid", () => {
    const schedule = buildSchedule(["-12"]);

    expect(schedule.hasInvalidInputs).toBe(true);
    expect(schedule.weeks[0].error).toBe("Hours cannot be negative.");
  });

  it("allows decimal hour inputs", () => {
    const schedule = buildSchedule(["12.5"]);

    expect(schedule.hasInvalidInputs).toBe(false);
    expect(schedule.enteredHours).toBe(12.5);
    expect(schedule.plannedHours).toBe(360.5);
  });

  it("accepts entered hours above 360 without adding suggested hours", () => {
    const schedule = buildSchedule(["360", "12"]);

    expect(schedule.isComplete).toBe(true);
    expect(schedule.plannedHours).toBe(372);
    expect(schedule.suggestedHours).toBe(0);
  });

  it("accepts a fully filled 360 hour schedule", () => {
    const schedule = buildSchedule(["36", "36", "36", "36", "36", "36", "36", "36", "24", "24", "24"]);

    expect(schedule.isComplete).toBe(true);
    expect(schedule.plannedHours).toBe(360);
  });

  it("warns when all weeks are filled below 360", () => {
    const schedule = buildSchedule(["24", "24", "24", "24", "24", "24", "24", "24", "24", "24", "24"]);

    expect(schedule.isComplete).toBe(false);
    expect(schedule.message).toBe("Add 96 hours to reach at least 360.");
  });
});
