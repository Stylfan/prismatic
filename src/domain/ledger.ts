import { itemPoints, summarizeGoal, type BacklogItem } from "./backlog";
import type { SizeTable } from "./sizes";

/**
 * What the backlog says about each quarter, before anything is typed over
 * it. Delivered is the work closed in the quarter: features with their own
 * points, and goals without features with their estimate (a goal with
 * features is delivered through them). Planned is the open work placed in
 * the quarter, half of it for each quarter of a half-year, counted like
 * the roadmap's columns: features where they sit, a goal's undivided rest
 * where the goal sits.
 */

export type LedgerItem = BacklogItem & {
  doneQuarter: number | null;
  periodIndex: number | null;
  periodSpan: number;
};

export function deliveredByQuarter(table: SizeTable, all: LedgerItem[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const item of all) {
    if (item.status !== "done" || item.doneQuarter === null) continue;
    let points = 0;
    if (item.kind === "feature") points = itemPoints(table, item) ?? 0;
    else if (summarizeGoal(table, item, all).featureCount === 0)
      points = itemPoints(table, item) ?? 0;
    out.set(item.doneQuarter, (out.get(item.doneQuarter) ?? 0) + points);
  }
  return out;
}

export function plannedByQuarter(table: SizeTable, all: LedgerItem[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const item of all) {
    if (item.status === "done" || item.periodIndex === null) continue;
    let points = 0;
    if (item.kind === "feature") points = itemPoints(table, item) ?? 0;
    else {
      const s = summarizeGoal(table, item, all);
      points = Math.max(0, s.scope - s.featurePoints);
    }
    const span = item.periodSpan === 2 ? 2 : 1;
    for (let k = 0; k < span; k += 1) {
      const q = item.periodIndex + k;
      out.set(q, (out.get(q) ?? 0) + points / span);
    }
  }
  return out;
}
