import { getTranslations } from "next-intl/server";
import { formatPeriodLabel } from "@/components/program/period-label";
import type { BacklogOptions, ItemView } from "@/components/backlog/types";
import type { Item } from "@/db/schema";
import { itemPoints, summarizeGoal, warningsFor, type BacklogItem } from "@/domain/backlog";
import {
  halfLabel,
  quarterIndexOf,
  quarterLabel,
  roadmapColumns,
  type PeriodSettings,
} from "@/domain/periods";
import type { ProgramFull } from "@/services/programs";
import { todayInCopenhagen } from "./dates";

/**
 * Builds the backlog page's rows and options on the server: points,
 * warnings and period labels worked out once, in Danish, so the client
 * components only display and edit.
 */
export async function buildBacklogView(full: ProgramFull, rows: Item[]) {
  const tp = await getTranslations("periods");
  const tm = await getTranslations("milestones");
  const { program, sizes, milestones } = full;
  const settings: PeriodSettings = { model: program.periodModel, startDate: program.startDate };
  const today = todayInCopenhagen();
  const currentQuarter = Math.max(0, quarterIndexOf(settings, today));

  const periodLabel = (index: number | null, span: number) =>
    index === null
      ? null
      : formatPeriodLabel(
          tp,
          span === 2 ? halfLabel(settings, index) : quarterLabel(settings, index),
        );

  const all: BacklogItem[] = rows;
  const titleOf = new Map(rows.map((r) => [r.id, r.title]));

  const views: ItemView[] = rows.map((r) => {
    const base = {
      id: r.id,
      kind: r.kind,
      title: r.title,
      description: r.description,
      track: r.track,
      size: r.size,
      pointsOverride: r.pointsOverride,
      integration: r.integration,
      status: r.status,
      doneQuarter: r.doneQuarter,
      doneNote: r.doneNote,
      parentId: r.parentId,
      milestoneId: r.milestoneId,
      periodIndex: r.periodIndex,
      periodSpan: (r.periodSpan === 2 ? 2 : 1) as 1 | 2,
      periodLabel: periodLabel(r.periodIndex, r.periodSpan),
      doneQuarterLabel: periodLabel(r.doneQuarter, 1),
      splitFromTitle: r.splitFromId ? (titleOf.get(r.splitFromId) ?? null) : null,
      warnings: warningsFor(sizes, r, all, program.deviationPct),
    };
    if (r.kind !== "goal") return { ...base, points: itemPoints(sizes, r) };
    const s = summarizeGoal(sizes, r, all);
    return {
      ...base,
      points: s.estimate ?? (s.featurePoints > 0 ? s.featurePoints : null),
      featurePoints: s.featurePoints,
      donePoints: s.done,
      featureCount: s.featureCount,
    };
  });

  // Planned periods: the roadmap's columns from now on, plus any period an item already sits in.
  const periodOptions = new Map<string, string>();
  for (const c of roadmapColumns(settings, today, program.quarterHorizon)) {
    periodOptions.set(`${c.index}:${c.span}`, periodLabel(c.index, c.span)!);
  }
  for (const v of views) {
    if (v.periodIndex !== null && !periodOptions.has(`${v.periodIndex}:${v.periodSpan}`)) {
      periodOptions.set(`${v.periodIndex}:${v.periodSpan}`, v.periodLabel!);
    }
  }
  const sortedPeriods = [...periodOptions.entries()].sort(
    (a, b) => Number(a[0].split(":")[0]) - Number(b[0].split(":")[0]),
  );

  const doneQuarters = [];
  for (let i = 0; i <= currentQuarter; i += 1) {
    doneQuarters.push({ value: String(i), label: periodLabel(i, 1)! });
  }

  const options: BacklogOptions = {
    milestones: milestones.map((m) => ({
      value: m.id,
      label: `${tm("code", { seq: m.seq })} · ${m.title}`,
    })),
    goals: rows.filter((r) => r.kind === "goal").map((g) => ({ value: g.id, label: g.title })),
    periods: sortedPeriods.map(([value, label]) => ({ value, label })),
    doneQuarters: doneQuarters.reverse(),
    currentQuarter,
    sizePoints: sizes,
  };

  return { views, options };
}
