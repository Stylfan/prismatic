import { describe, expect, it } from "vitest";
import { niceStep, spreadLabels } from "@/components/forecast/chart-scale";

/** The chart's frame: round figures on the scale, and milestone names that never overlap. */

describe("the scale", () => {
  it("steps in round numbers", () => {
    expect(niceStep(850)).toBe(1000);
    expect(niceStep(400)).toBe(500);
    expect(niceStep(180)).toBe(200);
    expect(niceStep(2300)).toBe(2500);
  });
});

describe("milestone names", () => {
  it("stay at their line when there is room", () => {
    const placed = spreadLabels(
      [
        { id: "a", at: 50 },
        { id: "b", at: 200 },
      ],
      22,
      300,
    );
    expect(placed.get("a")).toBe(50);
    expect(placed.get("b")).toBe(200);
  });

  it("move apart when they would touch, keeping their order", () => {
    const placed = spreadLabels(
      [
        { id: "m2", at: 150 },
        { id: "m3", at: 140 },
        { id: "m4", at: 130 },
      ],
      22,
      300,
    );
    expect([placed.get("m4"), placed.get("m3"), placed.get("m2")]).toEqual([130, 152, 174]);
  });

  it("move up together when the lowest would leave the chart", () => {
    const placed = spreadLabels(
      [
        { id: "a", at: 290 },
        { id: "b", at: 295 },
      ],
      22,
      300,
    );
    expect(placed.get("b")).toBe(300);
    expect(placed.get("a")).toBe(278);
  });
});
