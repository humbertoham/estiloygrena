import { describe, it, expect } from "vitest";
import {
  slotsForDay,
  zoned,
  localTime,
  localDate,
  overlaps,
} from "../../lib/availability";
const input = {
  date: "2026-11-03",
  hours: [{ startTime: "10:00", endTime: "19:00" }],
  unavailable: [],
  duration: 60,
  interval: 60,
  notice: 0,
  maxDays: 60,
  buffer: 0,
  now: new Date("2026-11-01T12:00:00Z"),
};
const times = (i: Partial<typeof input> = {}) =>
  slotsForDay({ ...input, ...i }).map(localTime);
describe("availability", () => {
  it("uses hourly starts by default", () =>
    expect(times()).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "13:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
      "18:00",
    ]));
  it("supports 30 minute starts", () =>
    expect(times({ interval: 30 })).toHaveLength(17));
  it("supports 90 minute starts", () =>
    expect(times({ interval: 90 })).toEqual([
      "10:00",
      "11:30",
      "13:00",
      "14:30",
      "16:00",
      "17:30",
    ]));
  it("supports 15 minute starts", () =>
    expect(times({ interval: 15 })).toHaveLength(33));
  it("requires long services to fit completely", () =>
    expect(times({ duration: 180 }).at(-1)).toBe("16:00"));
  it("returns no slots on closed days", () =>
    expect(times({ hours: [] })).toEqual([]));
  it("supports multiple working intervals", () =>
    expect(
      times({
        hours: [
          { startTime: "10:00", endTime: "12:00" },
          { startTime: "15:00", endTime: "17:00" },
        ],
      }),
    ).toEqual(["10:00", "11:00", "15:00", "16:00"]));
  it("uses custom hours instead of weekly hours", () =>
    expect(
      times({ hours: [{ startTime: "14:00", endTime: "16:00" }] }),
    ).toEqual(["14:00", "15:00"]));
  it("uses half-open intervals for back-to-back bookings", () =>
    expect(
      overlaps(
        {
          startAt: zoned(input.date, "10:00"),
          endAt: zoned(input.date, "11:00"),
        },
        {
          startAt: zoned(input.date, "11:00"),
          endAt: zoned(input.date, "12:00"),
        },
      ),
    ).toBe(false));
  it("respects notice periods", () =>
    expect(times({ now: zoned(input.date, "10:01"), notice: 60 })[0]).toBe(
      "12:00",
    ));
  it("respects booking horizon", () =>
    expect(times({ maxDays: 1 })).toEqual([]));
  it("respects buffers at closing", () =>
    expect(times({ buffer: 15 }).at(-1)).toBe("17:00"));
  it("converts with the named timezone", () => {
    expect(zoned(input.date, "10:00").toISOString()).toBe(
      "2026-11-03T16:00:00.000Z",
    );
    expect(localDate(new Date("2026-11-04T04:00:00Z"))).toBe("2026-11-03");
  });
  it("rejects nonpositive intervals", () =>
    expect(times({ interval: 0 })).toEqual([]));
});
