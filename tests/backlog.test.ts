import { describe, expect, it } from "vitest";
import {
  milestoneComputedScope,
  summarizeGoal,
  warningsFor,
  type BacklogItem,
} from "@/domain/backlog";
import { DEFAULT_POINTS } from "@/domain/sizes";

const item = (over: Partial<BacklogItem> & Pick<BacklogItem, "id" | "kind">): BacklogItem => ({
  parentId: null,
  milestoneId: null,
  size: null,
  pointsOverride: null,
  status: "planned",
  ...over,
});

// Goal L = 400 points, broken into three features: 100 + 100 + 150 = 350.
const goal = item({ id: "g", kind: "goal", size: "L", milestoneId: "m1" });
const f1 = item({ id: "f1", kind: "feature", parentId: "g", size: "L", status: "done" });
const f2 = item({ id: "f2", kind: "feature", parentId: "g", size: "L" });
const f3 = item({ id: "f3", kind: "feature", parentId: "g", size: "XL" });
const all = [goal, f1, f2, f3];

describe("a business goal", () => {
  it("counts its own estimate, never the estimate plus its features", () => {
    expect(summarizeGoal(DEFAULT_POINTS, goal, all)).toEqual({
      id: "g",
      estimate: 400,
      featurePoints: 350,
      scope: 400,
      done: 100,
      featureCount: 3,
    });
  });

  it("falls back to its features when it has no estimate", () => {
    const bare = { ...goal, size: null };
    expect(summarizeGoal(DEFAULT_POINTS, bare, [bare, f1, f2, f3]).scope).toBe(350);
  });

  it("warns when its features differ 10 % or more from the estimate, either way", () => {
    // 350 against 400 is 13 % below.
    expect(warningsFor(DEFAULT_POINTS, goal, all, 10)).toEqual([
      { kind: "deviation", featurePoints: 350, estimate: 400, pct: 13 },
    ]);
    // 440 against 400 is exactly 10 % above.
    const over = [goal, f1, f2, { ...f3, pointsOverride: 240 }];
    expect(warningsFor(DEFAULT_POINTS, goal, over, 10)[0]).toMatchObject({ pct: 10 });
    // 380 against 400 is 5 %: no warning.
    const close = [goal, f1, f2, { ...f3, pointsOverride: 180 }];
    expect(warningsFor(DEFAULT_POINTS, goal, close, 10)).toEqual([]);
  });

  it("warns when it hangs under no milestone", () => {
    const loose = { ...goal, milestoneId: null };
    expect(warningsFor(DEFAULT_POINTS, loose, [loose], 10)).toEqual([{ kind: "noMilestone" }]);
  });
});

describe("a feature", () => {
  it("warns when it belongs to no goal and when it has no estimate", () => {
    const loose = item({ id: "x", kind: "feature" });
    expect(warningsFor(DEFAULT_POINTS, loose, [loose], 10)).toEqual([
      { kind: "noGoal" },
      { kind: "notEstimated" },
    ]);
  });
});

describe("a milestone's own scope", () => {
  it("adds its goals' scope and the features that point at it without a goal", () => {
    const direct = item({ id: "d", kind: "feature", milestoneId: "m1", size: "S" });
    // A feature under a goal counts through the goal, even if it names the milestone too.
    const tagged = { ...f2, milestoneId: "m1" };
    expect(milestoneComputedScope(DEFAULT_POINTS, "m1", [goal, f1, tagged, f3, direct])).toBe(440);
  });
});
