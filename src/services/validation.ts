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
  track: z.enum(TRACKS),
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

export const MoveItemSchema = z.object({ itemId: id, ...period });
export const PlaceMilestoneSchema = z.object({ milestoneId: id, ...period });
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
export const NewRiskSchema = z.object({ programId: id, title: text(400).min(1) });
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
