import { z } from "zod";
import { ITEM_KINDS, ITEM_STATUSES, SIZES, SIZE_LEVELS, TRACKS } from "@/db/schema";
import { MAX_POINTS } from "@/domain/sizes";

/** Input schemas for everything a page may write. Lengths are the product's, not the database's. */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const id = z.string().min(1).max(64);
const text = (max: number) => z.string().trim().max(max);
const points = z.number().int().min(0).max(MAX_POINTS);

export const ProgramFields = z.object({
  name: text(80).min(1),
  goal: text(300),
  // The custom start model is kept in the period arithmetic but not offered yet.
  periodModel: z.enum(["seasons", "calendar"]),
  startDate: isoDate,
  quarterHorizon: z.number().int().min(1).max(4),
  costPerQuarter: z.number().int().min(0).max(999_999_999).nullable(),
  deviationPct: z.number().int().min(1).max(100),
});
export type ProgramInput = z.infer<typeof ProgramFields>;

export const UpdateProgramSchema = ProgramFields.extend({ programId: id });

export const SetSizePointsSchema = z.object({
  programId: id,
  level: z.enum(SIZE_LEVELS),
  size: z.enum(SIZES),
  points,
});

export const NewMilestoneSchema = z.object({ programId: id, title: text(120).min(1) });

export const UpdateMilestoneSchema = z.object({
  milestoneId: id,
  title: text(120).min(1),
  description: text(600),
  scopeOverride: points.nullable(),
});

export const MoveMilestoneSchema = z.object({ milestoneId: id, direction: z.enum(["up", "down"]) });
export const MilestoneDoneSchema = z.object({ milestoneId: id, done: z.boolean() });
export const MilestoneIdSchema = z.object({ milestoneId: id });
export const ProgramIdSchema = z.object({ programId: id });

const nullableId = id.nullable();
const period = {
  periodIndex: z.number().int().min(-200).max(400).nullable(),
  periodSpan: z.union([z.literal(1), z.literal(2)]),
};

export const NewItemSchema = z.object({
  programId: id,
  kind: z.enum(ITEM_KINDS),
  title: text(160).min(1),
  parentId: nullableId,
  milestoneId: nullableId,
});

export const UpdateItemSchema = z.object({
  itemId: id,
  title: text(160).min(1),
  description: text(2000),
  // No longer asked for; kept so older clients and tests still validate.
  track: z.enum(TRACKS).optional(),
  size: z.enum(SIZES).nullable(),
  pointsOverride: points.nullable(),
  integration: z.boolean(),
  status: z.enum(ITEM_STATUSES),
  doneQuarter: z.number().int().min(-200).max(400).nullable(),
  doneNote: text(2000),
  parentId: nullableId,
  milestoneId: nullableId,
  ...period,
});

export const SplitItemSchema = z.object({
  itemId: id,
  deliveredPoints: points,
  doneNote: text(2000),
  doneQuarter: z.number().int().min(-200).max(400),
  newTitle: text(160).min(1),
  newParentId: nullableId,
  newSize: z.enum(SIZES).nullable(),
  newPointsOverride: points.nullable(),
  newPeriodIndex: period.periodIndex,
  newPeriodSpan: period.periodSpan,
});

export const ItemIdSchema = z.object({ itemId: id });

const arranged = { programId: id, ids: z.array(id).min(1).max(500) };
/** A new order for a milestone's goals, or for a goal's features; null is "without". */
export const ArrangeItemsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("goal"), milestoneId: id.nullable(), ...arranged }),
  z.object({ kind: z.literal("feature"), parentId: id.nullable(), ...arranged }),
]);

export const MoveItemSchema = z.object({ itemId: id, ...period });
export const PlaceMilestoneSchema = z.object({ milestoneId: id, ...period });
/** A roadmap column's new order after a drop, and the period of the one that was moved. */
export const ArrangeBoardSchema = z.object({
  programId: id,
  kind: z.enum(["item", "milestone"]),
  movedId: id,
  ids: z.array(id).min(1).max(500),
  ...period,
});
export const NewEventSchema = z.object({
  programId: id,
  quarterIndex: z.number().int().min(-200).max(400),
  title: text(120).min(1),
});
export const EventIdSchema = z.object({ eventId: id });

export const SaveQuarterSchema = z.object({
  programId: id,
  quarterIndex: z.number().int().min(-200).max(400),
  capacityPct: z.number().int().min(0).max(300),
  deliveredOverride: points.nullable(),
  plannedOverride: points.nullable(),
  comment: text(300),
});

const scale = z.number().int().min(1).max(10);
export const NewRiskSchema = z.object({
  programId: id,
  title: text(400).min(1),
  consequence: text(2000).default(""),
  mitigation: text(2000).default(""),
});
export const UpdateRiskSchema = z.object({
  riskId: id,
  title: text(400).min(1),
  consequence: text(2000),
  mitigation: text(2000),
  changeNote: text(1000),
  probability: scale,
  impact: scale,
  status: z.enum(["open", "closed"]),
});
export const RiskIdSchema = z.object({ riskId: id });

export const NewGoalSchema = z.object({
  programId: id,
  quarterIndex: z.number().int().min(-200).max(400),
  title: text(400).min(1),
  parentId: id.nullable(),
  stretch: z.boolean(),
});
export const UpdateGoalSchema = z.object({
  goalId: id,
  title: text(400).min(1),
  stretch: z.boolean(),
  status: z.enum(["open", "achieved", "partial", "missed"]),
});
export const GoalIdSchema = z.object({ goalId: id });

export const NewTitledSchema = z.object({ programId: id, title: text(200).min(1) });
export const UpdateCaseSchema = z.object({
  caseId: id,
  title: text(200).min(1),
  problem: text(4000),
  background: text(4000),
  keyPoints: text(4000),
  nextSteps: text(4000),
  status: z.enum(["open", "decided"]),
});
export const CaseIdSchema = z.object({ caseId: id });
export const UpdateDecisionSchema = z.object({
  decisionId: id,
  title: text(200).min(1),
  decidedOn: text(60),
  forum: text(120),
  decision: text(4000),
  effect: z.enum(["simplifying", "complicating", "neutral", "pending"]),
});
export const DecisionIdSchema = z.object({ decisionId: id });

export const SaveDraftSchema = z.object({
  programId: id,
  statusText: text(8000),
  changeText: text(8000),
  goalsQuarter: z.number().int().min(-200).max(400).nullable(),
});
export const PublishSchema = z.object({ programId: id, title: text(120).min(1) });
