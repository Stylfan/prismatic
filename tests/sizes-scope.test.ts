import { describe, expect, it } from "vitest";
import { cumulativeScopes } from "@/domain/scope";
import { DEFAULT_POINTS, defaultSizeRows, resolvePoints } from "@/domain/sizes";

describe("sizes", () => {
  it("start every program with the agreed defaults", () => {
    const rows = defaultSizeRows();
    expect(rows.filter((r) => r.level === "feature").map((r) => r.points)).toEqual([
      20, 40, 60, 100, 150,
    ]);
    expect(rows.filter((r) => r.level === "goal").map((r) => r.points)).toEqual([
      100, 150, 250, 400, 600, 1000,
    ]);
  });

  it("give a feature no XXL", () => {
    expect(defaultSizeRows().some((r) => r.level === "feature" && r.size === "XXL")).toBe(false);
  });

  it("let a card's own points win over its size", () => {
    expect(resolvePoints(DEFAULT_POINTS, "goal", "L", null)).toBe(400);
    expect(resolvePoints(DEFAULT_POINTS, "goal", "L", 380)).toBe(380);
    expect(resolvePoints(DEFAULT_POINTS, "feature", null, null)).toBeNull();
    expect(resolvePoints(DEFAULT_POINTS, "feature", "XXL", null)).toBeNull();
  });
});

describe("milestone scope", () => {
  it("builds each milestone on the ones before it", () => {
    const scopes = cumulativeScopes([
      { id: "m2", seq: 2, scopeOverride: null, computed: 500 },
      { id: "m1", seq: 1, scopeOverride: null, computed: 1000 },
    ]);
    expect(scopes.map((s) => [s.id, s.own, s.cumulative])).toEqual([
      ["m1", 1000, 1000],
      ["m2", 500, 1500],
    ]);
  });

  it("uses a hand-typed scope instead of the computed one", () => {
    const [m1] = cumulativeScopes([{ id: "m1", seq: 1, scopeOverride: 2542, computed: 0 }]);
    expect(m1).toMatchObject({ own: 2542, overridden: true, cumulative: 2542 });
  });
});
