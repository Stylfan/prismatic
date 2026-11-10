import type { ItemKind, ItemStatus, Size, Track } from "@/db/schema";
import type { Warning } from "@/domain/backlog";

/**
 * What the backlog page hands its client components: rows with their
 * points, warnings and period already worked out, and the options the
 * editors choose from. Labels are rendered on the server so the client
 * never needs the period arithmetic.
 */

export type Option = { value: string; label: string };

export type ItemView = {
  id: string;
  kind: ItemKind;
  title: string;
  description: string;
  track: Track;
  size: Size | null;
  pointsOverride: number | null;
  /** What the card counts: its own points, or for a goal its scope. */
  points: number | null;
  integration: boolean;
  status: ItemStatus;
  doneQuarter: number | null;
  doneNote: string;
  parentId: string | null;
  milestoneId: string | null;
  periodIndex: number | null;
  periodSpan: 1 | 2;
  /** "Efterår 2026", or null when not yet planned. */
  periodLabel: string | null;
  doneQuarterLabel: string | null;
  splitFromTitle: string | null;
  warnings: Warning[];
  /** For goals: points of their features, and how many of them are done. */
  featurePoints?: number;
  donePoints?: number;
  featureCount?: number;
};

export type BacklogOptions = {
  milestones: Option[];
  goals: Option[];
  /** Planned periods as "index:span", plus "" for not yet planned. */
  periods: Option[];
  /** Quarters an item can be closed in, as the quarter index. */
  doneQuarters: Option[];
  currentQuarter: number;
  /** Points per size, per level, for showing what a size is worth while editing. */
  sizePoints: { feature: Partial<Record<Size, number>>; goal: Partial<Record<Size, number>> };
};

export const periodValue = (index: number | null, span: 1 | 2) =>
  index === null ? "" : `${index}:${span}`;

export function parsePeriod(value: string): { periodIndex: number | null; periodSpan: 1 | 2 } {
  if (value === "") return { periodIndex: null, periodSpan: 1 };
  const [index, span] = value.split(":").map(Number);
  return { periodIndex: index ?? null, periodSpan: span === 2 ? 2 : 1 };
}
