import { describe, expect, it } from "vitest";
import { recentTempo } from "@/domain/forecast";

/** The overview's tempo: what was delivered in the last three ended quarters, on average. */

const row = (phase: "past" | "current" | "future", value: number) => ({ phase, value });

describe("the recent tempo", () => {
  it("averages what was delivered in the last three ended quarters, whatever the capacity", () => {
    const rows = [
      row("past", 180),
      row("past", 97),
      row("past", 236),
      row("past", 118),
      row("current", 40),
      row("future", 300),
    ];
    expect(recentTempo(rows)).toBeCloseTo((97 + 236 + 118) / 3, 5);
  });

  it("uses what there is before three quarters have ended, and nothing before the first", () => {
    expect(recentTempo([row("past", 300), row("current", 10)])).toBe(300);
    expect(recentTempo([row("current", 10)])).toBeNull();
  });
});
