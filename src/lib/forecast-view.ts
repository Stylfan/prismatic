import { getTranslations } from "next-intl/server";
import { formatDate, formatPeriodLabel } from "@/components/program/period-label";
import type { Item, ProgramEvent, QuarterRecord } from "@/db/schema";
import { milestoneComputedScope } from "@/domain/backlog";
import {
  costUntil,
  forecast,
  TEMPI,
  velocity,
  type ForecastResult,
  type Tempo,
} from "@/domain/forecast";
import { deliveredByQuarter, plannedByQuarter } from "@/domain/ledger";
import {
  quarterEnd,
  quarterIndexOf,
  quarterLabel,
  quarterStart,
  type PeriodSettings,
} from "@/domain/periods";
import { cumulativeScopes } from "@/domain/scope";
import type { ProgramFull } from "@/services/programs";
import { todayInCopenhagen } from "./dates";

/**
 * Everything the "Fremdrift" page shows, worked out on the server: the
 * quarter ledger with computed and typed numbers side by side, the three
 * tempi, the forecast per milestone with its price, and the chart series.
 */

export type LedgerRow = {
  index: number;
  label: string;
  range: string;
  phase: "past" | "current" | "future";
  capacityPct: number;
  /** Computed from the backlog: closed work for a past quarter, placed open work otherwise. */
  computed: number;
  override: number | null;
  /** What counts: the typed number, or the computed one. */
  value: number;
  /** For the current quarter: what has been closed in it so far. */
  deliveredSoFar: number;
  velocity: number | null;
  comment: string;
  events: string[];
};

export type MilestoneRow = {
  id: string;
  code: string;
  title: string;
  threshold: number;
  reached: string | null;
  at: Record<Tempo, { label: string; cost: number | null } | null>;
};

export type ForecastView = {
  rows: LedgerRow[];
  result: ForecastResult;
  milestones: MilestoneRow[];
  currentIndex: number;
  /** Short labels for the chart's x axis, by quarter index. */
  axisLabels: Record<number, string>;
  costPerQuarter: number | null;
};

const shorten = (label: string) => label.replace(/\b20(\d\d)\b/g, "$1");

export async function buildForecastView(
  full: ProgramFull,
  items: Item[],
  records: QuarterRecord[],
  events: ProgramEvent[],
): Promise<ForecastView> {
  const tp = await getTranslations("periods");
  const tm = await getTranslations("milestones");
  const { program, sizes, milestones } = full;
  const settings: PeriodSettings = { model: program.periodModel, startDate: program.startDate };
  const currentIndex = Math.max(0, quarterIndexOf(settings, todayInCopenhagen()));
  const label = (i: number) => formatPeriodLabel(tp, quarterLabel(settings, i));

  const delivered = deliveredByQuarter(sizes, items);
  const planned = plannedByQuarter(sizes, items);
  const record = new Map(records.map((r) => [r.quarterIndex, r]));
  const capacityOf = (i: number) => record.get(i)?.capacityPct ?? 100;

  const rows: LedgerRow[] = [];
  for (let i = 0; i <= currentIndex + 7; i += 1) {
    const r = record.get(i);
    const phase = i < currentIndex ? "past" : i === currentIndex ? "current" : "future";
    const computed = Math.round(phase === "past" ? (delivered.get(i) ?? 0) : (planned.get(i) ?? 0));
    const override =
      phase === "past" ? (r?.deliveredOverride ?? null) : (r?.plannedOverride ?? null);
    const value = override ?? computed;
    const capacityPct = capacityOf(i);
    rows.push({
      index: i,
      label: label(i),
      range: `${formatDate(quarterStart(settings, i))} – ${formatDate(quarterEnd(settings, i))}`,
      phase,
      capacityPct,
      computed,
      override,
      value,
      deliveredSoFar: phase === "current" ? (delivered.get(i) ?? 0) : 0,
      velocity:
        phase === "past"
          ? velocity({ index: i, delivered: value, capacity: capacityPct / 100 })
          : null,
      comment: r?.comment ?? "",
      events: events.filter((e) => e.quarterIndex === i).map((e) => e.title),
    });
  }

  const scopes = cumulativeScopes(
    milestones.map((m) => ({
      id: m.id,
      seq: m.seq,
      scopeOverride: m.scopeOverride,
      computed: milestoneComputedScope(sizes, m.id, items),
    })),
  );
  const result = forecast({
    past: rows
      .filter((r) => r.phase === "past")
      .map((r) => ({
        index: r.index,
        delivered: r.value,
        capacity: r.capacityPct / 100,
      })),
    currentIndex,
    futureCapacity: (i) => capacityOf(i) / 100,
    thresholds: scopes.map((s) => ({ id: s.id, points: s.cumulative })),
  });

  const milestoneRows: MilestoneRow[] = milestones.map((m) => {
    const f = result.milestones.find((x) => x.id === m.id)!;
    const at = {} as MilestoneRow["at"];
    for (const tempo of TEMPI) {
      const idx = f.at[tempo];
      at[tempo] =
        idx === null ? null : { label: label(idx), cost: costUntil(idx, program.costPerQuarter) };
    }
    return {
      id: m.id,
      code: tm("code", { seq: m.seq }),
      title: m.title,
      threshold: f.threshold,
      reached: f.reachedAt === null ? null : label(f.reachedAt),
      at,
    };
  });

  const axisLabels: Record<number, string> = {};
  for (const p of result.series) axisLabels[p.index] = shorten(label(p.index));
  for (const r of rows) axisLabels[r.index] ??= shorten(r.label);

  return {
    rows,
    result,
    milestones: milestoneRows,
    currentIndex,
    axisLabels,
    costPerQuarter: program.costPerQuarter,
  };
}
