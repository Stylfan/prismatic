import type { Db } from "@/db/client";
import {
  decisionCases,
  decisions,
  items,
  milestones,
  programEvents,
  programSizes,
  quarterGoals,
  quarterRecords,
  reportDrafts,
  risks,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  quarterIndexOf,
  quarterStart,
  roadmapColumns,
  type PeriodSettings,
} from "@/domain/periods";
import { todayInCopenhagen } from "@/lib/dates";
import { createProgram } from "@/services/programs";
import {
  DEMO_EVENTS,
  DEMO_ITEMS,
  DEMO_MILESTONES,
  DEMO_QUARTERS,
  DEMO_SIZES,
  type DemoItem,
} from "./backlog";
import {
  DEMO_CASES,
  DEMO_CHANGE_TEXT,
  DEMO_DECISIONS,
  DEMO_GOALS,
  DEMO_RISKS,
  DEMO_STATUS_TEXT,
} from "./report";

/**
 * Creates the example programme for a user: a year of delivered quarters,
 * the current quarter in progress, a roadmap ahead, milestones, risks and
 * the steering group's material. It is anchored to today, so the history
 * always ends last quarter: the programme starts four quarters ago.
 *
 * The content's periods are written relative to that: 0-3 are the past
 * quarters, 4-7 the near quarters from now, 8, 10 and 12 the three
 * half-years after them. Runs as the user, so row-level security applies,
 * and the tests use it as a realistic fixture.
 */

export const DEMO_NAME = "Eksempel: Nyt kernesystem";

export async function createDemoProgram(
  tx: Db,
  userId: string,
  today = todayInCopenhagen(),
): Promise<string> {
  const anchor: PeriodSettings = { model: "seasons", startDate: "2000-09-01" };
  const startDate = quarterStart(anchor, quarterIndexOf(anchor, today) - 4);
  const settings: PeriodSettings = { model: "seasons", startDate };

  const programId = await createProgram(tx, userId, {
    name: DEMO_NAME,
    goal: "Et nyt kernesystem til kunder, abonnementer og fakturering, før det gamle system når sin udløbsdato.",
    periodModel: "seasons",
    startDate,
    quarterHorizon: 4,
    costPerQuarter: 3_575_000,
    deviationPct: 10,
  });

  for (const level of ["feature", "goal"] as const) {
    for (const [size, points] of Object.entries(DEMO_SIZES[level])) {
      await tx
        .update(programSizes)
        .set({ points })
        .where(
          and(
            eq(programSizes.programId, programId),
            eq(programSizes.level, level),
            eq(programSizes.size, size as keyof (typeof DEMO_SIZES)["goal"]),
          ),
        );
    }
  }

  // Where a relative period lands on this programme's own roadmap.
  const columns = roadmapColumns(settings, today, 4);
  const near = columns.filter((c) => c.span === 1);
  const far = columns.filter((c) => c.span === 2);
  const place = (period: number | null): { index: number | null; span: 1 | 2 } => {
    if (period === null) return { index: null, span: 1 };
    if (period < 4) return { index: period, span: 1 };
    if (period < 8) return { index: near[period - 4]?.index ?? period, span: 1 };
    const half = far[(period - 8) / 2];
    return half ? { index: half.index, span: 2 } : { index: null, span: 1 };
  };

  const milestoneId = new Map<string, string>();
  for (const [n, m] of DEMO_MILESTONES.entries()) {
    const at = place(m.period);
    const [row] = await tx
      .insert(milestones)
      .values({
        programId,
        seq: n + 1,
        title: m.title,
        description: m.description,
        periodIndex: at.index,
        periodSpan: at.span,
      })
      .returning({ id: milestones.id });
    milestoneId.set(m.key, row!.id);
  }

  const estimates = demoEstimates();
  const itemId = new Map<string, string>();
  for (const item of [...DEMO_ITEMS].sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === "goal" ? -1 : 1,
  )) {
    const at = place(item.period);
    const [row] = await tx
      .insert(items)
      .values({
        programId,
        kind: item.kind,
        title: item.title,
        description: item.description ?? "",
        track: item.track,
        size: item.size,
        pointsOverride: estimates.get(item.key) ?? null,
        integration: item.integration ?? false,
        parentId: item.parent ? itemId.get(item.parent)! : null,
        milestoneId: item.milestone ? milestoneId.get(item.milestone)! : null,
        status: item.done !== undefined ? "done" : item.inProgress ? "in_progress" : "planned",
        doneQuarter: item.done ?? null,
        periodIndex: at.index,
        periodSpan: item.span ?? at.span,
      })
      .returning({ id: items.id });
    itemId.set(item.key, row!.id);
  }

  await tx.insert(quarterRecords).values(
    DEMO_QUARTERS.map((q) => ({
      programId,
      quarterIndex: place(q.index).index ?? q.index,
      capacityPct: q.capacity,
      comment: q.comment,
    })),
  );
  await tx.insert(programEvents).values(
    DEMO_EVENTS.map((e) => ({
      programId,
      quarterIndex: place(e.index).index ?? e.index,
      title: e.title,
    })),
  );

  await tx.insert(risks).values(
    DEMO_RISKS.map((r, n) => ({
      programId,
      number: n + 1,
      title: r.title,
      consequence: r.consequence,
      mitigation: r.mitigation,
      changeNote: r.changeNote,
      probability: r.probability,
      impact: r.impact,
      status: r.closed ? ("closed" as const) : ("open" as const),
    })),
  );

  const current = near[0]?.index ?? 4;
  for (const g of DEMO_GOALS) {
    const [row] = await tx
      .insert(quarterGoals)
      .values({
        programId,
        quarterIndex: current,
        title: g.title,
        stretch: g.stretch ?? false,
        status: g.status,
      })
      .returning({ id: quarterGoals.id });
    for (const sub of g.sub ?? []) {
      await tx
        .insert(quarterGoals)
        .values({ programId, quarterIndex: current, title: sub, parentId: row!.id });
    }
  }
  await tx.insert(decisionCases).values(DEMO_CASES.map((c) => ({ programId, ...c })));
  await tx.insert(decisions).values(
    DEMO_DECISIONS.map((d) => ({
      programId,
      title: d.title,
      decidedOn: d.when,
      forum: "Styregruppe",
      decision: d.decision,
      effect: d.effect,
    })),
  );
  await tx.insert(reportDrafts).values({
    programId,
    statusText: DEMO_STATUS_TEXT,
    changeText: DEMO_CHANGE_TEXT,
    goalsQuarter: current,
  });

  return programId;
}

/** A feature's points: what it delivered, or its size. */
const featurePointsOf = (i: DemoItem) =>
  i.points ?? (i.size && i.size !== "XXL" ? DEMO_SIZES.feature[i.size] : 0);

/**
 * The points each card is given beyond its size. A closed feature carries
 * what it delivered; a goal that is only its features is estimated as their
 * sum, so it raises no warning; and the goals sized by T-shirt share what
 * is left of their milestone's own scope in proportion to their size. The
 * milestones' scope then follows from their goals, as it does for anyone.
 */
export function demoEstimates(): Map<string, number> {
  const out = new Map<string, number>();
  for (const i of DEMO_ITEMS) if (i.points !== undefined) out.set(i.key, i.points);
  const goals = DEMO_ITEMS.filter((i) => i.kind === "goal");
  for (const g of goals.filter((g) => g.size === null)) {
    const sum = DEMO_ITEMS.filter((i) => i.parent === g.key).reduce(
      (n, i) => n + featurePointsOf(i),
      0,
    );
    out.set(g.key, sum);
  }
  for (const m of DEMO_MILESTONES) {
    const own = goals.filter((g) => g.milestone === m.key);
    const fixed = own.filter((g) => g.size === null).reduce((n, g) => n + out.get(g.key)!, 0);
    const sized = own.filter((g) => g.size !== null);
    const weight = (g: DemoItem) => DEMO_SIZES.goal[g.size!];
    const total = sized.reduce((n, g) => n + weight(g), 0);
    let left = m.scope - fixed;
    sized.forEach((g, n) => {
      const points =
        n === sized.length - 1 ? left : Math.round(((m.scope - fixed) * weight(g)) / total);
      out.set(g.key, points);
      left -= points;
    });
  }
  return out;
}
