import { describe, expect, it } from "vitest";
import {
  addMonthsIso,
  firstQuarterStart,
  isHalfStart,
  quarterEnd,
  quarterIndexOf,
  quarterLabel,
  quarterStart,
  roadmapColumns,
  type PeriodSettings,
} from "@/domain/periods";

const seasons: PeriodSettings = { model: "seasons", startDate: "2025-09-01" };
const calendar: PeriodSettings = { model: "calendar", startDate: "2026-05-15" };
const custom: PeriodSettings = { model: "custom", startDate: "2026-01-15" };

describe("addMonthsIso", () => {
  it("holds the day where the month allows it and clamps where it does not", () => {
    expect(addMonthsIso("2026-01-15", 3)).toBe("2026-04-15");
    expect(addMonthsIso("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonthsIso("2026-12-01", 3)).toBe("2027-03-01");
    expect(addMonthsIso("2026-03-01", -3)).toBe("2025-12-01");
  });
});

describe("the seasons model (Djøf)", () => {
  it("starts autumn on 1 September and runs winter across the new year", () => {
    expect(firstQuarterStart(seasons)).toBe("2025-09-01");
    expect(quarterEnd(seasons, 0)).toBe("2025-11-30");
    expect(quarterStart(seasons, 1)).toBe("2025-12-01");
    expect(quarterEnd(seasons, 1)).toBe("2026-02-28");
  });

  it("names winter by December's year", () => {
    expect(quarterLabel(seasons, 0)).toEqual({
      kind: "quarter",
      model: "seasons",
      season: "autumn",
      year: 2025,
    });
    expect(quarterLabel(seasons, 1)).toMatchObject({ season: "winter", year: 2025 });
    expect(quarterLabel(seasons, 2)).toMatchObject({ season: "spring", year: 2026 });
  });

  it("snaps a start inside a quarter back to that quarter's first day", () => {
    expect(firstQuarterStart({ model: "seasons", startDate: "2026-01-20" })).toBe("2025-12-01");
  });

  it("lays out the roadmap the steering group saw in November 2026", () => {
    const columns = roadmapColumns(seasons, "2026-11-09", 2, 2);
    expect(columns.map((c) => [c.span, c.start, c.end])).toEqual([
      [1, "2026-09-01", "2026-11-30"],
      [1, "2026-12-01", "2027-02-28"],
      [2, "2027-03-01", "2027-08-31"],
      [2, "2027-09-01", "2028-02-29"],
    ]);
    expect(columns[2]!.label).toEqual({ kind: "half", model: "seasons", half: 1, year: 2027 });
    expect(columns[3]!.label).toEqual({ kind: "half", model: "seasons", half: 2, year: 2027 });
  });

  it("allows half-years to start in spring and autumn only", () => {
    expect(isHalfStart(seasons, 0)).toBe(true); // autumn
    expect(isHalfStart(seasons, 1)).toBe(false); // winter
    expect(isHalfStart(seasons, 2)).toBe(true); // spring
  });
});

describe("the calendar model", () => {
  it("starts in the calendar quarter the start date falls in", () => {
    expect(firstQuarterStart(calendar)).toBe("2026-04-01");
    expect(quarterLabel(calendar, 0)).toEqual({
      kind: "quarter",
      model: "calendar",
      quarter: 2,
      year: 2026,
    });
  });

  it("keeps quarters until a half-year can start in January or July", () => {
    const columns = roadmapColumns(calendar, "2026-11-09", 2, 1);
    expect(columns.map((c) => [c.span, c.start])).toEqual([
      [1, "2026-10-01"],
      [1, "2027-01-01"],
      [1, "2027-04-01"],
      [2, "2027-07-01"],
    ]);
  });
});

describe("the custom model", () => {
  it("counts quarters of three calendar months from the chosen day", () => {
    expect(quarterStart(custom, 0)).toBe("2026-01-15");
    expect(quarterEnd(custom, 0)).toBe("2026-04-14");
    expect(quarterStart(custom, 4)).toBe("2027-01-15");
  });

  it("finds the quarter a date falls in, on both sides of the boundary", () => {
    expect(quarterIndexOf(custom, "2026-04-14")).toBe(0);
    expect(quarterIndexOf(custom, "2026-04-15")).toBe(1);
    expect(quarterIndexOf(custom, "2026-01-14")).toBe(-1);
  });

  it("does not drift when the start day is the 31st", () => {
    const end: PeriodSettings = { model: "custom", startDate: "2026-01-31" };
    expect(quarterStart(end, 1)).toBe("2026-04-30");
    expect(quarterStart(end, 2)).toBe("2026-07-31");
  });

  it("pairs quarters into half-years from the start", () => {
    expect(isHalfStart(custom, 0)).toBe(true);
    expect(isHalfStart(custom, 1)).toBe(false);
  });
});

describe("before the program starts", () => {
  it("begins the roadmap at the program's first quarter", () => {
    const later: PeriodSettings = { model: "seasons", startDate: "2027-09-01" };
    expect(roadmapColumns(later, "2026-11-09", 1, 0)[0]!.start).toBe("2027-09-01");
  });
});
