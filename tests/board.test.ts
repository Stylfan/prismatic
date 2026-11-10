import { describe, expect, it } from "vitest";
import type { BacklogItem } from "@/domain/backlog";
import { columnLoad, locate, milestonePlacementWarnings } from "@/domain/board";
import { roadmapColumns } from "@/domain/periods";
import { DEFAULT_POINTS } from "@/domain/sizes";

// November 2026, seasons from September 2025: Efterår 26 (4), Vinter 26/27 (5),
// then half-years starting at 6, 8 and 10, then "not yet planned" (column 5).
const columns = roadmapColumns({ model: "seasons", startDate: "2025-09-01" }, "2026-11-09", 2);

const item = (
  over: Partial<BacklogItem & { periodIndex: number | null; periodSpan: number; title: string }> &
    Pick<BacklogItem, "id" | "kind">,
) => ({
  parentId: null,
  milestoneId: null,
  size: null,
  pointsOverride: null,
  status: "planned" as const,
  periodIndex: null,
  periodSpan: 1,
  title: over.id,
  ...over,
});

describe("locating a card", () => {
  it("puts quarters, half-years and the unplanned in their columns", () => {
    expect(columns.map((c) => [c.index, c.span])).toEqual([
      [4, 1],
      [5, 1],
      [6, 2],
      [8, 2],
      [10, 2],
    ]);
    expect(locate(columns, { periodIndex: 5, periodSpan: 1 })).toEqual({
      column: 1,
      overdue: false,
    });
    expect(locate(columns, { periodIndex: 6, periodSpan: 2 }).column).toBe(2);
    // A single quarter inside a half-year shows in that half-year.
    expect(locate(columns, { periodIndex: 9, periodSpan: 1 }).column).toBe(3);
    expect(locate(columns, { periodIndex: null, periodSpan: 1 }).column).toBe(5);
  });

  it("marks work planned for a quarter that has passed as overdue in the first column", () => {
    expect(locate(columns, { periodIndex: 2, periodSpan: 1 })).toEqual({
      column: 0,
      overdue: true,
    });
  });

  it("keeps work planned beyond the far horizon in the last column", () => {
    expect(locate(columns, { periodIndex: 20, periodSpan: 2 }).column).toBe(4);
  });
});

describe("column load", () => {
  it("counts open features where they are and a goal's undivided rest where the goal is", () => {
    const goal = item({ id: "g", kind: "goal", size: "L", periodIndex: 6, periodSpan: 2 }); // 400
    const f1 = item({ id: "f1", kind: "feature", parentId: "g", size: "L", periodIndex: 4 }); // 100
    const f2 = item({
      id: "f2",
      kind: "feature",
      parentId: "g",
      size: "M",
      status: "done",
      periodIndex: 4,
    }); // 60, done
    const loose = item({ id: "x", kind: "feature", size: "S" }); // 40, unplanned
    expect(columnLoad(DEFAULT_POINTS, columns, [goal, f1, f2, loose])).toEqual([
      100, 0, 240, 0, 0, 40,
    ]);
  });
});

describe("milestone placement", () => {
  it("warns when a milestone's own work is planned after it, or not at all", () => {
    const goal = item({ id: "g", kind: "goal", milestoneId: "m1", periodIndex: 5 });
    const early = item({ id: "f1", kind: "feature", parentId: "g", periodIndex: 4 });
    const late = item({ id: "f2", kind: "feature", parentId: "g", periodIndex: 8, periodSpan: 2 });
    const direct = item({ id: "d", kind: "feature", milestoneId: "m1" }); // not planned
    const done = item({
      id: "f3",
      kind: "feature",
      parentId: "g",
      status: "done",
      periodIndex: 10,
    });
    const warnings = milestonePlacementWarnings(
      columns,
      [
        { id: "m1", periodIndex: 5, periodSpan: 1 },
        { id: "m2", periodIndex: null, periodSpan: 1 },
      ],
      [goal, early, late, direct, done],
    );
    expect(warnings).toEqual([
      {
        milestoneId: "m1",
        later: [
          { id: "f2", title: "f2" },
          { id: "d", title: "d" },
        ],
      },
    ]);
  });
});
