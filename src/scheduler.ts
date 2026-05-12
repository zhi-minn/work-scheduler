export const WEEK_COUNT = 11;
export const TOTAL_HOURS = 360;
export const SHIFT_HOURS = 12;
export const TOTAL_SHIFTS = TOTAL_HOURS / SHIFT_HOURS;

export type WeekStatus = "entered" | "suggested" | "blank" | "invalid";

export type WeekPlan = {
  week: number;
  input: string;
  enteredHours: number | null;
  suggestedHours: number | null;
  status: WeekStatus;
  error: string | null;
};

export type ScheduleSummary = {
  weeks: WeekPlan[];
  enteredHours: number;
  suggestedHours: number;
  plannedHours: number;
  remainingHours: number;
  overageHours: number;
  blankWeeks: number;
  hasInvalidInputs: boolean;
  isComplete: boolean;
  message: string;
};

export function normalizeInputs(inputs: string[]): string[] {
  return Array.from({ length: WEEK_COUNT }, (_, index) => inputs[index] ?? "");
}

export function buildSchedule(rawInputs: string[]): ScheduleSummary {
  const inputs = normalizeInputs(rawInputs);
  const weeks: WeekPlan[] = [];
  let enteredHours = 0;
  let blankWeeks = 0;
  let hasInvalidInputs = false;

  inputs.forEach((input, index) => {
    const trimmed = input.trim();

    if (trimmed === "") {
      blankWeeks += 1;
      weeks.push({
        week: index + 1,
        input,
        enteredHours: null,
        suggestedHours: null,
        status: "blank",
        error: null
      });
      return;
    }

    const numericValue = Number(trimmed);
    let error: string | null = null;

    if (!Number.isFinite(numericValue)) {
      error = "Use a valid number of hours.";
    } else if (numericValue < 0) {
      error = "Hours cannot be negative.";
    }

    if (error) {
      hasInvalidInputs = true;
      weeks.push({
        week: index + 1,
        input,
        enteredHours: null,
        suggestedHours: null,
        status: "invalid",
        error
      });
      return;
    }

    enteredHours += numericValue;
    weeks.push({
      week: index + 1,
      input,
      enteredHours: numericValue,
      suggestedHours: null,
      status: "entered",
      error: null
    });
  });

  const hoursNeededBeforeSuggestions = Math.max(0, TOTAL_HOURS - enteredHours);
  let suggestedHours = 0;

  if (!hasInvalidInputs && blankWeeks > 0) {
    const suggestedShifts = Math.ceil(hoursNeededBeforeSuggestions / SHIFT_HOURS);
    const baseShifts = Math.floor(suggestedShifts / blankWeeks);
    const extraShiftWeeks = suggestedShifts % blankWeeks;
    let blankIndex = 0;

    weeks.forEach((week) => {
      if (week.status !== "blank") {
        return;
      }

      const shifts = baseShifts + (blankIndex < extraShiftWeeks ? 1 : 0);
      week.suggestedHours = shifts * SHIFT_HOURS;
      week.status = "suggested";
      suggestedHours += week.suggestedHours;
      blankIndex += 1;
    });
  }

  const plannedHours = enteredHours + suggestedHours;
  const remainingHours = Math.max(0, TOTAL_HOURS - plannedHours);
  const overageHours = Math.max(0, plannedHours - TOTAL_HOURS);
  const isComplete = !hasInvalidInputs && plannedHours >= TOTAL_HOURS;
  const message = getSummaryMessage({
    hasInvalidInputs,
    isComplete,
    remainingHours,
    overageHours
  });

  return {
    weeks,
    enteredHours,
    suggestedHours,
    plannedHours,
    remainingHours,
    overageHours,
    blankWeeks,
    hasInvalidInputs,
    isComplete,
    message
  };
}

function getSummaryMessage({
  hasInvalidInputs,
  isComplete,
  remainingHours,
  overageHours
}: Pick<
  ScheduleSummary,
  "hasInvalidInputs" | "isComplete" | "remainingHours" | "overageHours"
>): string {
  if (hasInvalidInputs) {
    return "Fix the highlighted weeks to calculate suggestions.";
  }

  if (isComplete && overageHours === 0) {
    return "This 11-week chunk reaches 360 hours exactly.";
  }

  if (isComplete) {
    return `This plan reaches at least 360 hours, with ${formatHours(overageHours)} extra.`;
  }

  return `Add ${formatHours(remainingHours)} hours to reach at least 360.`;
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}` : `${Number(hours.toFixed(2))}`;
}
