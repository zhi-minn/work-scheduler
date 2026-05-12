import { WEEK_COUNT } from "./scheduler";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric"
});

export function getWeekOfLabels(startDate: string): string[] {
  const parsedStart = parseDateInput(startDate);

  if (!parsedStart) {
    return Array.from({ length: WEEK_COUNT }, () => "Set start date");
  }

  return Array.from({ length: WEEK_COUNT }, (_, index) => {
    const weekDate = new Date(parsedStart.getTime() + index * WEEK_MS);
    return `Week of ${dateFormatter.format(weekDate)}`;
  });
}

export function getChunkTabDate(startDate: string): string {
  const parsedStart = parseDateInput(startDate);
  return parsedStart ? dateFormatter.format(parsedStart) : "No date";
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}
