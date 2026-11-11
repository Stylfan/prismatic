import { describe, expect, it } from "vitest";
import { recentTempo } from "@/domain/forecast";

/** The overview's tempo: the average of the last three ended quarters, nothing older or newer. */

const row = (label: string, phase: "past" | "current" | "future", velocity: number | null) => ({
  label,
  phase,
  velocity,
});

describe("the recent tempo", () => {
  it("averages the last three ended quarters", () => {
    const rows = [
      row("A", "past", 400),
      row("B", "past", 242.5),
      row("C", "past", 524.4),
      row("D", "past", 357.6),
      row("E", "current", null),
      row("F", "future", null),
    ];
    const tempo = recentTempo(rows)!;
    expect(tempo.value).toBeCloseTo((242.5 + 524.4 + 357.6) / 3, 5);
    expect(tempo.labels).toBe("B, C, D");
  });

  it("uses what there is before three quarters have ended, and nothing before the first", () => {
    expect(recentTempo([row("A", "past", 300), row("B", "current", null)])!.value).toBe(300);
    expect(recentTempo([row("A", "current", null)])).toBeNull();
  });
});
