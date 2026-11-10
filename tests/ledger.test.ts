import { describe, expect, it } from "vitest";
import { deliveredByQuarter, plannedByQuarter, type LedgerItem } from "@/domain/ledger";
import { DEFAULT_POINTS } from "@/domain/sizes";

const item = (over: Partial<LedgerItem> & Pick<LedgerItem, "id" | "kind">): LedgerItem => ({
  parentId: null,
  milestoneId: null,
  size: null,
  pointsOverride: null,
  status: "planned",
  doneQuarter: null,
  periodIndex: null,
  periodSpan: 1,
  ...over,
});

describe("delivered per quarter", () => {
  it("counts closed features, and a goal only when it has no features", () => {
    const goal = item({ id: "g", kind: "goal", size: "L", status: "done", doneQuarter: 3 });
    const f = item({
      id: "f",
      kind: "feature",
      parentId: "g",
      size: "M",
      status: "done",
      doneQuarter: 3,
    });
    const bare = item({ id: "b", kind: "goal", size: "S", status: "done", doneQuarter: 4 });
    const open = item({ id: "o", kind: "feature", size: "XL" });
    expect([...deliveredByQuarter(DEFAULT_POINTS, [goal, f, bare, open])]).toEqual([
      [3, 60],
      [4, 150],
    ]);
  });
});

describe("planned per quarter", () => {
  it("halves a half-year's work over its two quarters and leaves the unplanned out", () => {
    const f = item({ id: "f", kind: "feature", size: "L", periodIndex: 6, periodSpan: 2 });
    const q = item({ id: "q", kind: "feature", size: "S", periodIndex: 6 });
    const none = item({ id: "n", kind: "feature", size: "XL" });
    expect([...plannedByQuarter(DEFAULT_POINTS, [f, q, none])]).toEqual([
      [6, 90],
      [7, 50],
    ]);
  });
});
