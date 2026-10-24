// Asia/Bangkok is UTC+7 year-round (no DST), so a fixed offset is exact.
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function bangkokDate(at: Date = new Date()): string {
  return new Date(at.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateString(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function bangkokDayRange(date: string): { start: string; end: string } {
  if (!isValidDateString(date)) throw new Error(`Invalid date: ${date}`);
  const startMs = Date.parse(`${date}T00:00:00Z`) - BANGKOK_OFFSET_MS;
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + DAY_MS).toISOString() };
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}
