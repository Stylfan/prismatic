import { describe, expect, it } from "vitest";
import { costUntil, forecast, velocityStats } from "@/domain/forecast";

/**
 * The forecast against the programme's own spreadsheet ("2026-04-01 -
 * Fremdrift", sheet "Quarterly Cap. Adjusted Pro 1"): six quarters from
 * Efterår 25 to Vinter 27 with their delivered points and capacity, full
 * capacity from then on, and a scope of 2,581 points. The spreadsheet
 * forecasts completion in quarter 11 (high), 12 (average) and 14 (low),
 * at 42,900,000 kr. for the average.
 */

const past = [
  { index: 0, delivered: 180, capacity: 0.45 },
  { index: 1, delivered: 97, capacity: 0.4 },
  { index: 2, delivered: 236, capacity: 0.45 },
  { index: 3, delivered: 118, capacity: 0.33 },
  { index: 4, delivered: 200, capacity: 0.6 },
  { index: 5, delivered: 100, capacity: 0.85 },
];

describe("velocity", () => {
  it("gives the spreadsheet's three tempi after six quarters", () => {
    const velocities = past.map((q) => q.delivered / q.capacity);
    const stats = velocityStats(velocities)!;
    expect(stats.avg).toBeCloseTo(315.1001, 3);
    expect(stats.low).toBeCloseTo(231.1601, 3);
    expect(stats.high).toBeCloseTo(405.1178, 3);
  });

  it("uses the lowest and highest while there are three quarters or fewer", () => {
    expect(velocityStats([400, 242.5])).toEqual({ low: 242.5, avg: 321.25, high: 400 });
    expect(velocityStats([])).toBeNull();
  });
});

describe("the forecast", () => {
  const result = forecast({
    past,
    currentIndex: 6,
    futureCapacity: () => 1,
    thresholds: [{ id: "scope", points: 2581 }],
  });

  it("projects from what has been delivered", () => {
    expect(result.delivered).toBe(931);
    const q7 = result.series.find((p) => p.index === 6)!;
    expect(q7.avg).toBeCloseTo(1246.1001, 3);
    expect(q7.low).toBeCloseTo(1162.1601, 3);
    expect(q7.high).toBeCloseTo(1336.1178, 3);
  });

  it("reaches the scope in the same quarters as the spreadsheet", () => {
    // Quarter numbers in the spreadsheet start at 1; indices here at 0.
    expect(result.milestones[0]!.at).toEqual({ high: 10, avg: 11, low: 13 });
    expect(costUntil(11, 3_575_000)).toBe(42_900_000);
  });

  it("knows a milestone that is already reached", () => {
    const done = forecast({
      past,
      currentIndex: 6,
      futureCapacity: () => 1,
      thresholds: [{ id: "early", points: 500 }],
    });
    expect(done.milestones[0]).toMatchObject({
      reachedAt: 2,
      at: { low: null, avg: null, high: null },
    });
  });

  it("follows a planned dip in capacity", () => {
    const dip = forecast({
      past,
      currentIndex: 6,
      futureCapacity: (i) => (i === 6 ? 0.5 : 1),
      thresholds: [],
    });
    expect(dip.series.find((p) => p.index === 6)!.avg).toBeCloseTo(931 + 315.1001 / 2, 3);
  });

  it("has nothing to project before a quarter has ended", () => {
    const empty = forecast({ past: [], currentIndex: 0, futureCapacity: () => 1, thresholds: [] });
    expect(empty.stats).toBeNull();
    expect(empty.series).toEqual([]);
  });
});
