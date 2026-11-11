import type { ItemKind, ItemStatus, Size } from "@/db/schema";
import { resolvePoints, type SizeTable } from "./sizes";

/**
 * The backlog's arithmetic (CLAUDE.md, domain rules). A goal's scope is its
 * own estimate, never the goal plus its features: the features are the
 * goal broken down. Done is the closed features with their own points.
 * Warnings tell the manager where the picture does not hang together; none
 * of them blocks anything.
 */

export type BacklogItem = {
  id: string;
  kind: ItemKind;
  parentId: string | null;
  milestoneId: string | null;
  size: Size | null;
  pointsOverride: number | null;
  status: ItemStatus;
};

export type Warning =
  | { kind: "noGoal" }
  | { kind: "noMilestone" }
  | { kind: "notEstimated" }
  | { kind: "deviation"; featurePoints: number; estimate: number; pct: number };

export type GoalSummary = {
  id: string;
  /** The goal's own estimate, or null when it has none. */
  estimate: number | null;
  /** The sum of its features' points. */
  featurePoints: number;
  /** What the forecast counts: the estimate, or the features when the goal has no estimate. */
  scope: number;
  /** Points of its features that are done. */
  done: number;
  featureCount: number;
};

export function itemPoints(table: SizeTable, item: BacklogItem): number | null {
  return resolvePoints(table, item.kind, item.size, item.pointsOverride);
}

export function summarizeGoal(
  table: SizeTable,
  goal: BacklogItem,
  all: BacklogItem[],
): GoalSummary {
  const features = all.filter((i) => i.kind === "feature" && i.parentId === goal.id);
  const pointsOf = (i: BacklogItem) => itemPoints(table, i) ?? 0;
  const estimate = itemPoints(table, goal);
  const featurePoints = features.reduce((sum, f) => sum + pointsOf(f), 0);
  return {
    id: goal.id,
    estimate,
    featurePoints,
    scope: estimate ?? featurePoints,
    done: features.filter((f) => f.status === "done").reduce((sum, f) => sum + pointsOf(f), 0),
    featureCount: features.length,
  };
}

/** Whole per cent the features differ from the estimate, or null when there is nothing to compare. */
export function deviationPct(summary: GoalSummary): number | null {
  if (summary.estimate === null || summary.estimate === 0 || summary.featureCount === 0)
    return null;
  return Math.round((Math.abs(summary.featurePoints - summary.estimate) / summary.estimate) * 100);
}

export function warningsFor(
  table: SizeTable,
  item: BacklogItem,
  all: BacklogItem[],
  thresholdPct: number,
): Warning[] {
  const warnings: Warning[] = [];
  if (item.kind === "feature" && item.parentId === null) warnings.push({ kind: "noGoal" });
  if (item.kind === "goal" && item.milestoneId === null) warnings.push({ kind: "noMilestone" });
  if (item.kind === "goal") {
    const summary = summarizeGoal(table, item, all);
    if (summary.estimate === null && summary.featureCount === 0)
      warnings.push({ kind: "notEstimated" });
    const pct = deviationPct(summary);
    if (pct !== null && pct >= thresholdPct) {
      warnings.push({
        kind: "deviation",
        featurePoints: summary.featurePoints,
        estimate: summary.estimate!,
        pct,
      });
    }
  } else if (itemPoints(table, item) === null) {
    warnings.push({ kind: "notEstimated" });
  }
  return warnings;
}

/**
 * Each milestone's own planned points: the scope of its goals, plus the
 * points of features that point at it directly because they have no goal.
 * A feature under a goal always counts through its goal.
 */
export function milestoneComputedScope(
  table: SizeTable,
  milestoneId: string,
  all: BacklogItem[],
): number {
  let total = 0;
  for (const item of all) {
    if (item.milestoneId !== milestoneId) continue;
    if (item.kind === "goal") total += summarizeGoal(table, item, all).scope;
    else if (item.parentId === null) total += itemPoints(table, item) ?? 0;
  }
  return total;
}

/**
 * How much of a milestone's own scope is done: the closed features of its
 * goals, a closed goal in full, and closed features that point at it
 * directly. Only the milestone's own work counts, never the milestones
 * before it, so a milestone nobody has started on is at zero.
 */
export function milestoneDone(table: SizeTable, milestoneId: string, all: BacklogItem[]): number {
  let total = 0;
  for (const item of all) {
    if (item.milestoneId !== milestoneId) continue;
    if (item.kind === "goal") {
      const s = summarizeGoal(table, item, all);
      total += item.status === "done" ? s.scope : s.done;
    } else if (item.parentId === null && item.status === "done") {
      total += itemPoints(table, item) ?? 0;
    }
  }
  return total;
}
