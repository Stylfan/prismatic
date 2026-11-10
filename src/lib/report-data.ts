import { getTranslations } from "next-intl/server";
import { formatPeriodLabel } from "@/components/program/period-label";
import type { Db } from "@/db/client";
import type { Decision, DecisionCase, GoalStatus } from "@/db/schema";
import { quarterIndexOf, quarterLabel, type PeriodSettings } from "@/domain/periods";
import { compareEditions, type ChangeControl, type Comparable } from "@/domain/report";
import { listEvents } from "@/services/events";
import { listItems } from "@/services/items";
import type { ProgramFull } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";
import {
  getDraft,
  latestEditionData,
  listCases,
  listDecisions,
  listGoals,
} from "@/services/report-content";
import { listRisks } from "@/services/risks";
import { buildBacklogView } from "./backlog-view";
import { todayInCopenhagen } from "./dates";
import { buildForecastView, type ForecastView } from "./forecast-view";
import {
  buildRoadmapView,
  type BoardCard,
  type BoardColumn,
  type BoardMilestone,
} from "./roadmap-view";

/**
 * Everything one report shows, as plain data. The live report is built
 * from the programme as it is; publishing freezes this structure as JSON.
 * `comparable` is what the next edition compares itself against.
 */

export type GoalNode = {
  id: string;
  title: string;
  stretch: boolean;
  status: GoalStatus;
  children: GoalNode[];
};

export type ReportData = {
  version: 1;
  generatedAt: number;
  program: { name: string; goal: string };
  statusText: string;
  changeText: string;
  figures: { delivered: number; scope: number; avgVelocity: number | null; openRisks: number };
  goals: { quarter: string; list: GoalNode[] };
  cases: Array<Omit<DecisionCase, "programId" | "createdAt" | "updatedAt">>;
  decisions: Array<Omit<Decision, "programId" | "createdAt" | "updatedAt">>;
  roadmap: { columns: BoardColumn[]; cards: BoardCard[]; milestones: BoardMilestone[] };
  delivered: Array<{
    quarter: string;
    items: Array<{
      id: string;
      title: string;
      kind: string;
      points: number | null;
      track: string;
      doneNote: string;
    }>;
  }>;
  forecast: Omit<ForecastView, "rows">;
  risks: Array<{
    id: string;
    number: number;
    title: string;
    consequence: string;
    mitigation: string;
    changeNote: string;
    probability: number;
    impact: number;
    status: "open" | "closed";
  }>;
  comparable: Comparable;
  /** Set when published: the change control against the edition before, and where each risk stood then. */
  changes?: ChangeControl;
  /** Set when published: there was no edition before this one. */
  first?: boolean;
  previousRisks?: Record<string, [number, number]>;
};

export async function buildReportData(db: Db, full: ProgramFull): Promise<ReportData> {
  const tp = await getTranslations("periods");
  const { program } = full;
  const items = listItems(db, program.id);
  const events = listEvents(db, program.id);
  const records = listQuarterRecords(db, program.id);
  const forecast = await buildForecastView(full, items, records, events);
  const roadmap = await buildRoadmapView(full, items, events, {
    avgVelocity: forecast.result.stats?.avg ?? null,
    capacityPct: (q) => records.find((r) => r.quarterIndex === q)?.capacityPct ?? 100,
  });
  const draft = getDraft(db, program.id);
  const risks = listRisks(db, program.id);

  const settings: PeriodSettings = { model: program.periodModel, startDate: program.startDate };
  const goalsQuarter =
    draft.goalsQuarter ?? Math.max(0, quarterIndexOf(settings, todayInCopenhagen()) - 1);
  const goalRows = listGoals(db, program.id).filter((g) => g.quarterIndex === goalsQuarter);
  const node = (g: (typeof goalRows)[number]): GoalNode => ({
    id: g.id,
    title: g.title,
    stretch: g.stretch,
    status: g.status,
    children: goalRows.filter((c) => c.parentId === g.id).map(node),
  });

  const { views: itemViews } = await buildBacklogView(full, items);
  const scope =
    itemViews.filter((v) => v.kind === "goal").reduce((s, g) => s + (g.points ?? 0), 0) +
    itemViews
      .filter((v) => v.kind === "feature" && v.parentId === null)
      .reduce((s, f) => s + (f.points ?? 0), 0);

  const forecastData: Omit<ForecastView, "rows"> = {
    result: forecast.result,
    milestones: forecast.milestones,
    currentIndex: forecast.currentIndex,
    axisLabels: forecast.axisLabels,
    costPerQuarter: forecast.costPerQuarter,
  };
  return {
    version: 1,
    generatedAt: Date.now(),
    program: { name: program.name, goal: program.goal },
    statusText: draft.statusText,
    changeText: draft.changeText,
    figures: {
      delivered: forecast.result.delivered,
      scope,
      avgVelocity: forecast.result.stats?.avg ?? null,
      openRisks: risks.filter((r) => r.status === "open").length,
    },
    goals: {
      quarter: formatPeriodLabel(tp, quarterLabel(settings, goalsQuarter)),
      list: goalRows.filter((g) => g.parentId === null).map(node),
    },
    cases: listCases(db, program.id).map((c) => ({
      id: c.id,
      title: c.title,
      problem: c.problem,
      background: c.background,
      keyPoints: c.keyPoints,
      nextSteps: c.nextSteps,
      status: c.status,
    })),
    decisions: listDecisions(db, program.id).map((x) => ({
      id: x.id,
      title: x.title,
      decidedOn: x.decidedOn,
      forum: x.forum,
      decision: x.decision,
      effect: x.effect,
    })),
    roadmap: { columns: roadmap.columns, cards: roadmap.cards, milestones: roadmap.milestones },
    delivered: roadmap.delivered.map((g) => ({
      quarter: g.quarter,
      items: g.items.map((i) => ({
        id: i.id,
        title: i.title,
        kind: i.kind,
        points: i.points,
        track: i.track,
        doneNote: i.doneNote,
      })),
    })),
    forecast: forecastData,
    risks: risks.map((r) => ({
      id: r.id,
      number: r.number,
      title: r.title,
      consequence: r.consequence,
      mitigation: r.mitigation,
      changeNote: r.changeNote,
      probability: r.probability,
      impact: r.impact,
      status: r.status,
    })),
    comparable: {
      items: itemViews.map((v) => ({
        id: v.id,
        kind: v.kind,
        title: v.title,
        points: v.points,
        period: v.status === "done" ? v.doneQuarterLabel : v.periodLabel,
        status: v.status,
        splitFromId: items.find((i) => i.id === v.id)?.splitFromId ?? null,
      })),
      risks: risks.map((r) => ({
        id: r.id,
        number: r.number,
        title: r.title,
        probability: r.probability,
        impact: r.impact,
        status: r.status,
      })),
      milestones: forecast.milestones.map((m) => ({
        id: m.id,
        code: m.code,
        title: m.title,
        forecast: m.reached ?? m.at.avg?.label ?? null,
      })),
    },
  };
}

/** The latest edition, if any, parsed. */
export function previousEdition(db: Db, programId: string): ReportData | null {
  const raw = latestEditionData(db, programId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReportData;
  } catch {
    return null;
  }
}

/** Change control between an edition (or the live report) and the one before it. */
export function changesSince(previous: ReportData | null, current: ReportData): ChangeControl {
  return compareEditions(previous?.comparable ?? null, current.comparable);
}

/** Freezes the report for publishing, with its changes against the edition before it. */
export function freeze(previous: ReportData | null, current: ReportData): ReportData {
  return {
    ...current,
    changes: changesSince(previous, current),
    first: previous === null,
    previousRisks: Object.fromEntries(
      (previous?.risks ?? []).map((r) => [r.id, [r.probability, r.impact] as [number, number]]),
    ),
  };
}
