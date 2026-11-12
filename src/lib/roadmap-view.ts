import { getTranslations } from "next-intl/server";
import type { ItemView, Option } from "@/components/backlog/types";
import { formatDate, formatPeriodLabel } from "@/components/program/period-label";
import type { Item, ProgramEvent } from "@/db/schema";
import { columnLoad, locate, milestonePlacementWarnings } from "@/domain/board";
import { programColumns, quarterLabel, type PeriodSettings } from "@/domain/periods";
import type { ProgramFull } from "@/services/programs";
import { buildBacklogView } from "./backlog-view";
import { todayInCopenhagen } from "./dates";

/**
 * Builds the roadmap board on the server: the columns with their labels
 * and planned points, the open cards and placed milestones in each column,
 * the quarter events, and the delivered work grouped by closing quarter.
 */

export type BoardColumn = {
  key: string;
  /** Quarter index and span to store when something is dropped here; null for "not yet planned". */
  periodIndex: number | null;
  periodSpan: 1 | 2;
  label: string;
  range: string | null;
  kind: "near" | "far" | "unplanned";
  load: number;
  /** Planned points as a share of what the average tempo can deliver here; null before a forecast exists. */
  pct: number | null;
  /** The points the average tempo can deliver here at the planned capacity; null before a forecast exists. */
  capacity: number | null;
  events: Array<{ id: string; title: string; quarter: string }>;
};

export type BoardCard = ItemView & {
  column: number;
  overdue: boolean;
  milestoneCode: string | null;
};

export type BoardMilestone = {
  id: string;
  code: string;
  title: string;
  column: number | null;
  /** Where it is stored, so a move within its own column keeps it. */
  periodIndex: number | null;
  periodSpan: 1 | 2;
  later: Array<{ id: string; title: string }>;
};

export async function buildRoadmapView(
  full: ProgramFull,
  rows: Item[],
  events: ProgramEvent[],
  capacity: { avgVelocity: number | null; capacityPct: (quarter: number) => number },
) {
  const tp = await getTranslations("periods");
  const tr = await getTranslations("roadmap");
  const tm = await getTranslations("milestones");
  const { program, sizes, milestones } = full;
  const settings: PeriodSettings = { model: program.periodModel, startDate: program.startDate };
  const periods = programColumns(settings, todayInCopenhagen(), program.roadmapYears);
  const { views, options } = await buildBacklogView(full, rows);

  const load = columnLoad(sizes, periods, rows);
  const quarterName = (i: number) => formatPeriodLabel(tp, quarterLabel(settings, i));

  const canOf = (p: { index: number; span: number }) => {
    if (capacity.avgVelocity === null) return null;
    let can = 0;
    for (let k = 0; k < p.span; k += 1)
      can += (capacity.avgVelocity * capacity.capacityPct(p.index + k)) / 100;
    return can > 0 ? Math.round(can) : null;
  };
  const pctOf = (p: { index: number; span: number }, points: number) => {
    const can = canOf(p);
    return can === null ? null : Math.round((points / can) * 100);
  };

  const columns: BoardColumn[] = periods.map((p, i) => ({
    key: `${p.index}:${p.span}`,
    periodIndex: p.index,
    periodSpan: p.span,
    label: formatPeriodLabel(tp, p.label),
    range: `${formatDate(p.start)} – ${formatDate(p.end)}`,
    kind: p.span === 1 ? "near" : "far",
    load: load[i] ?? 0,
    pct: pctOf(p, load[i] ?? 0),
    capacity: canOf(p),
    events: events
      .filter((e) => e.quarterIndex >= p.index && e.quarterIndex < p.index + p.span)
      .map((e) => ({ id: e.id, title: e.title, quarter: quarterName(e.quarterIndex) })),
  }));
  columns.push({
    key: "unplanned",
    periodIndex: null,
    periodSpan: 1,
    label: tr("unplanned"),
    range: null,
    kind: "unplanned",
    load: load[periods.length] ?? 0,
    pct: null,
    capacity: null,
    events: [],
  });

  const codeOf = new Map(milestones.map((m) => [m.id, tm("code", { seq: m.seq })]));
  const goalMilestone = new Map(
    rows.filter((r) => r.kind === "goal").map((g) => [g.id, g.milestoneId]),
  );
  const cards: BoardCard[] = views
    .filter((v) => v.status !== "done")
    .map((v) => {
      const where = locate(periods, v);
      const milestoneId =
        v.kind === "feature" && v.parentId ? goalMilestone.get(v.parentId) : v.milestoneId;
      return {
        ...v,
        column: where.column,
        overdue: where.overdue,
        milestoneCode: milestoneId ? (codeOf.get(milestoneId) ?? null) : null,
      };
    });

  // The order the manager gave them in each column; the rest after, as before.
  const rankOf = new Map(rows.map((r) => [r.id, r.boardRank]));
  const byRank = (a: number | null | undefined, b: number | null | undefined) =>
    (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER);
  cards.sort((a, b) => byRank(rankOf.get(a.id), rankOf.get(b.id)));

  const placementWarnings = milestonePlacementWarnings(periods, milestones, rows);
  const boardMilestones: BoardMilestone[] = [...milestones]
    .sort((a, b) => byRank(a.boardRank, b.boardRank) || a.seq - b.seq)
    .map((m) => ({
      id: m.id,
      code: tm("code", { seq: m.seq }),
      title: m.title,
      column: m.periodIndex === null ? null : locate(periods, m).column,
      periodIndex: m.periodIndex,
      periodSpan: m.periodSpan === 2 ? 2 : 1,
      later: placementWarnings.find((w) => w.milestoneId === m.id)?.later ?? [],
    }));

  // Delivered work, newest quarter first.
  const doneByQuarter = new Map<number, ItemView[]>();
  for (const v of views) {
    if (v.status !== "done" || v.doneQuarter === null) continue;
    doneByQuarter.set(v.doneQuarter, [...(doneByQuarter.get(v.doneQuarter) ?? []), v]);
  }
  const delivered = [...doneByQuarter.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([q, list]) => ({ quarter: quarterName(q), items: list }));

  // Quarters an event can be put in: every quarter the board shows.
  const eventQuarters: Option[] = periods.flatMap((p) =>
    Array.from({ length: p.span }, (_, k) => ({
      value: String(p.index + k),
      label: quarterName(p.index + k),
    })),
  );

  return { columns, cards, milestones: boardMilestones, delivered, eventQuarters, options };
}
