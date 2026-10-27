import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "./constants";
export type Range = { startAt: Date; endAt: Date };
export type Hours = { startTime: string; endTime: string };
export const overlaps = (a: Range, b: Range) =>
  a.startAt < b.endAt && b.startAt < a.endAt;
export const localDate = (now = new Date()) =>
  formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
export const localTime = (d: Date) => formatInTimeZone(d, TIMEZONE, "HH:mm");
export const zoned = (date: string, time: string) =>
  fromZonedTime(`${date}T${time}:00`, TIMEZONE);
export function slotsForDay(input: {
  date: string;
  hours: Hours[];
  unavailable: Range[];
  duration: number;
  interval: number;
  notice: number;
  maxDays: number;
  buffer: number;
  now?: Date;
}) {
  const {
    date,
    hours,
    unavailable,
    duration,
    interval,
    notice,
    maxDays,
    buffer,
    now = new Date(),
  } = input;
  const day = zoned(date, "00:00");
  if (
    !Number.isFinite(day.getTime()) ||
    interval <= 0 ||
    duration <= 0 ||
    date < localDate(now) ||
    day.getTime() > now.getTime() + maxDays * 86400000
  )
    return [];
  const result: Date[] = [];
  for (const h of hours) {
    const open = zoned(date, h.startTime),
      close = zoned(date, h.endTime);
    for (
      let t = open.getTime();
      t + (duration + buffer) * 60000 <= close.getTime();
      t += interval * 60000
    ) {
      const candidate = {
        startAt: new Date(t),
        endAt: new Date(t + (duration + buffer) * 60000),
      };
      if (
        t >= now.getTime() + notice * 60000 &&
        !unavailable.some((r) => overlaps(candidate, r))
      )
        result.push(candidate.startAt);
    }
  }
  return [...new Map(result.map((d) => [d.toISOString(), d])).values()].sort(
    (a, b) => +a - +b,
  );
}
