import type { BacklogItem } from "./backlog";
import { itemPoints, summarizeGoal } from "./backlog";
import type { Period } from "./periods";
import type { SizeTable } from "./sizes";

/**
 * The roadmap board's arithmetic (CLAUDE.md, domain rules). Columns are the
 * near quarters and far half-years from `roadmapColumns`, followed by
 * "Endnu ikke planlagt" at index `columns.length`.
 */

export type Placement = { periodIndex: number | null; periodSpan: number };

export type Located = {
  /** Column on the board; `columns.length` is "not yet planned". */
  column: number;
  /** Planned for a quarter that has already passed. */
  overdue: boolean;
};

/**
 * The column a placement falls in. A quarter inside a half-year column
 * lands in that half-year; a placement before the first column is shown
 * in the first one and marked overdue; one beyond the last half-year sits
 * in the last column.
 */
export function locate(columns: Period[], placement: Placement): Located {
  const unplanned = columns.length;
  if (placement.periodIndex === null || columns.length === 0) {
    return { column: unplanned, overdue: false };
  }
  const p = placement.periodIndex;
  if (p < columns[0]!.index) return { column: 0, overdue: true };
  const found = columns.findIndex((c) => p >= c.index && p < c.index + c.span);
  return { column: found === -1 ? columns.length - 1 : found, overdue: false };
}

export type ExtendedItem = BacklogItem & Placement;

/**
 * Planned points per column, counted the way the forecast counts scope:
 * every open feature in its own column, and for each open goal the part of
 * its estimate its features do not cover, in the goal's column. Done work
 * is delivery, not plan, and is left out.
 */
export function columnLoad(table: SizeTable, columns: Period[], all: ExtendedItem[]): number[] {
  const load = new Array<number>(columns.length + 1).fill(0);
  for (const item of all) {
    if (item.status === "done") continue;
    const { column } = locate(columns, item);
    if (item.kind === "feature") {
      load[column]! += itemPoints(table, item) ?? 0;
    } else {
      const s = summarizeGoal(table, item, all);
      load[column]! += Math.max(0, s.scope - s.featurePoints);
    }
  }
  return load;
}

export type MilestonePlacementWarning = {
  milestoneId: string;
  /** Open goals and features of the milestone placed later than the milestone itself. */
  later: Array<{ id: string; title: string }>;
};

/**
 * A milestone placed in a column with work of its own planned in a later
 * column, or not planned at all, is a plan that does not add up: that work
 * cannot be done before the milestone it belongs to.
 */
export function milestonePlacementWarnings(
  columns: Period[],
  milestones: Array<{ id: string } & Placement>,
  all: Array<ExtendedItem & { title: string }>,
): MilestonePlacementWarning[] {
  const goalMilestone = new Map(
    all.filter((i) => i.kind === "goal").map((g) => [g.id, g.milestoneId]),
  );
  const milestoneOf = (i: ExtendedItem) =>
    i.kind === "goal"
      ? i.milestoneId
      : i.parentId
        ? (goalMilestone.get(i.parentId) ?? null)
        : i.milestoneId;

  const warnings: MilestonePlacementWarning[] = [];
  for (const m of milestones) {
    if (m.periodIndex === null) continue;
    const at = locate(columns, m).column;
    const later = all
      .filter((i) => i.status !== "done" && milestoneOf(i) === m.id)
      .filter((i) => locate(columns, i).column > at)
      .map((i) => ({ id: i.id, title: i.title }));
    if (later.length > 0) warnings.push({ milestoneId: m.id, later });
  }
  return warnings;
}
