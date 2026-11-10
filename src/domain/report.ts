/**
 * A report edition's data and the comparison between two editions.
 *
 * An edition is frozen as plain JSON when it is published, so it reads the
 * same forever, whatever happens to the backlog afterwards. Comparing the
 * present with the latest edition gives the change control: what was
 * added, removed, moved, re-estimated or closed, how the risks moved, and
 * how each milestone's forecast shifted.
 */

export type ReportItem = {
  id: string;
  kind: "goal" | "feature";
  title: string;
  points: number | null;
  /** The period it is planned for, as shown, or null when not planned. */
  period: string | null;
  status: "planned" | "in_progress" | "done";
  splitFromId: string | null;
};

export type ReportRisk = {
  id: string;
  number: number;
  title: string;
  probability: number;
  impact: number;
  status: "open" | "closed";
};

export type ReportMilestone = { id: string; code: string; title: string; forecast: string | null };

export type Comparable = {
  items: ReportItem[];
  risks: ReportRisk[];
  milestones: ReportMilestone[];
};

export type ItemChange =
  | { kind: "added"; id: string; title: string; split: boolean }
  | { kind: "removed"; id: string; title: string }
  | { kind: "done"; id: string; title: string }
  | { kind: "moved"; id: string; title: string; from: string | null; to: string | null }
  | { kind: "reestimated"; id: string; title: string; from: number | null; to: number | null };

export type RiskChange =
  | { kind: "new"; number: number; title: string }
  | { kind: "closed"; number: number; title: string }
  | { kind: "moved"; number: number; title: string; from: [number, number]; to: [number, number] };

export type MilestoneChange = {
  code: string;
  title: string;
  from: string | null;
  to: string | null;
};

export type ChangeControl = {
  items: ItemChange[];
  risks: RiskChange[];
  milestones: MilestoneChange[];
  /** Items to mark with a star: new, moved, re-estimated or split since last time. */
  starred: string[];
  /** Risk numbers raised since last time, marked "NY". */
  newRisks: number[];
};

export function compareEditions(previous: Comparable | null, current: Comparable): ChangeControl {
  const result: ChangeControl = { items: [], risks: [], milestones: [], starred: [], newRisks: [] };
  if (!previous) return result;

  const before = new Map(previous.items.map((i) => [i.id, i]));
  const now = new Map(current.items.map((i) => [i.id, i]));
  for (const item of current.items) {
    const old = before.get(item.id);
    if (!old) {
      result.items.push({
        kind: "added",
        id: item.id,
        title: item.title,
        split: item.splitFromId !== null,
      });
      result.starred.push(item.id);
      continue;
    }
    if (item.status === "done" && old.status !== "done") {
      result.items.push({ kind: "done", id: item.id, title: item.title });
      continue;
    }
    if (item.status !== "done" && old.period !== item.period) {
      result.items.push({
        kind: "moved",
        id: item.id,
        title: item.title,
        from: old.period,
        to: item.period,
      });
      result.starred.push(item.id);
    }
    if (old.points !== item.points) {
      result.items.push({
        kind: "reestimated",
        id: item.id,
        title: item.title,
        from: old.points,
        to: item.points,
      });
      if (!result.starred.includes(item.id)) result.starred.push(item.id);
    }
  }
  for (const old of previous.items) {
    if (!now.has(old.id)) result.items.push({ kind: "removed", id: old.id, title: old.title });
  }

  const risksBefore = new Map(previous.risks.map((r) => [r.id, r]));
  for (const risk of current.risks) {
    const old = risksBefore.get(risk.id);
    if (!old) {
      result.risks.push({ kind: "new", number: risk.number, title: risk.title });
      result.newRisks.push(risk.number);
    } else if (risk.status === "closed" && old.status !== "closed") {
      result.risks.push({ kind: "closed", number: risk.number, title: risk.title });
    } else if (old.probability !== risk.probability || old.impact !== risk.impact) {
      result.risks.push({
        kind: "moved",
        number: risk.number,
        title: risk.title,
        from: [old.probability, old.impact],
        to: [risk.probability, risk.impact],
      });
    }
  }

  const forecastBefore = new Map(previous.milestones.map((m) => [m.id, m.forecast]));
  for (const m of current.milestones) {
    if (!forecastBefore.has(m.id)) continue;
    const from = forecastBefore.get(m.id) ?? null;
    if (from !== m.forecast)
      result.milestones.push({ code: m.code, title: m.title, from, to: m.forecast });
  }
  return result;
}
