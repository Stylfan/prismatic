import { z } from "zod";
import { PERIOD_MODELS, SIZES, SIZE_LEVELS } from "@/db/schema";
import { MAX_POINTS } from "@/domain/sizes";

/** Input schemas for everything a page may write. Lengths are the product's, not the database's. */

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const id = z.string().min(1).max(64);
const text = (max: number) => z.string().trim().max(max);
const points = z.number().int().min(0).max(MAX_POINTS);

export const ProgramFields = z.object({
  name: text(80).min(1),
  goal: text(300),
  periodModel: z.enum(PERIOD_MODELS),
  startDate: isoDate,
  quarterHorizon: z.number().int().min(1).max(8),
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
