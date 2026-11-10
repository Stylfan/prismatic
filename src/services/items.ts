import { and, asc, eq } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db/client";
import { items, milestones, programs, type Item } from "@/db/schema";
import { isSizeForLevel } from "@/domain/sizes";
import { NotFound } from "./programs";
import type { NewItemSchema, SplitItemSchema, UpdateItemSchema } from "./validation";

/**
 * Business goals and features. Links are checked against the programme
 * the item belongs to: a feature's goal must be a goal in the same
 * programme, a milestone must be one of the programme's, and a goal never
 * has a parent. A feature under a goal counts toward the goal's milestone,
 * so its own milestone is cleared.
 */

export function listItems(db: Db, programId: string): Item[] {
  return db
    .select()
    .from(items)
    .where(eq(items.programId, programId))
    .orderBy(asc(items.createdAt))
    .all();
}

function requireItem(db: Db, itemId: string): Item {
  const row = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!row) throw new NotFound();
  return row;
}

function checkGoal(db: Db, programId: string, goalId: string | null) {
  if (goalId === null) return;
  const goal = db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, goalId), eq(items.programId, programId), eq(items.kind, "goal")))
    .get();
  if (!goal) throw new NotFound();
}

function checkMilestone(db: Db, programId: string, milestoneId: string | null) {
  if (milestoneId === null) return;
  const m = db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.programId, programId)))
    .get();
  if (!m) throw new NotFound();
}

export function createItem(db: Db, input: z.infer<typeof NewItemSchema>): string {
  const program = db
    .select({ id: programs.id })
    .from(programs)
    .where(eq(programs.id, input.programId))
    .get();
  if (!program) throw new NotFound();
  const parentId = input.kind === "goal" ? null : input.parentId;
  checkGoal(db, input.programId, parentId);
  checkMilestone(db, input.programId, input.milestoneId);
  const [row] = db
    .insert(items)
    .values({
      programId: input.programId,
      kind: input.kind,
      title: input.title,
      parentId,
      milestoneId: parentId ? null : input.milestoneId,
    })
    .returning({ id: items.id })
    .all();
  return row!.id;
}

export function updateItem(db: Db, input: z.infer<typeof UpdateItemSchema>): string {
  const row = requireItem(db, input.itemId);
  const parentId = row.kind === "goal" ? null : input.parentId;
  if (parentId === row.id) throw new NotFound();
  checkGoal(db, row.programId, parentId);
  checkMilestone(db, row.programId, input.milestoneId);
  const size = input.size !== null && isSizeForLevel(row.kind, input.size) ? input.size : null;
  const done = input.status === "done";
  db.update(items)
    .set({
      title: input.title,
      description: input.description,
      track: input.track,
      size,
      pointsOverride: input.pointsOverride,
      integration: input.integration,
      status: input.status,
      doneQuarter: done ? input.doneQuarter : null,
      doneNote: input.doneNote,
      parentId,
      milestoneId: parentId ? null : input.milestoneId,
      periodIndex: input.periodIndex,
      periodSpan: input.periodSpan,
    })
    .where(eq(items.id, row.id))
    .run();
  return row.programId;
}

/** Deletes an item. A deleted goal's features stay, without a goal, so nothing is lost silently. */
export function deleteItem(db: Db, itemId: string): string {
  const row = requireItem(db, itemId);
  db.delete(items).where(eq(items.id, row.id)).run();
  return row.programId;
}

/**
 * Splits a feature that is partly done: the original closes with the
 * points actually delivered and a note of what is done, and the rest
 * becomes a new feature with its own estimate, which may belong to another
 * goal or to none.
 */
export function splitFeature(db: Db, input: z.infer<typeof SplitItemSchema>): string {
  const row = requireItem(db, input.itemId);
  if (row.kind !== "feature") throw new NotFound();
  checkGoal(db, row.programId, input.newParentId);
  const size =
    input.newSize !== null && isSizeForLevel("feature", input.newSize) ? input.newSize : null;
  return db.transaction((tx) => {
    tx.update(items)
      .set({
        status: "done",
        pointsOverride: input.deliveredPoints,
        doneQuarter: input.doneQuarter,
        doneNote: input.doneNote,
      })
      .where(eq(items.id, row.id))
      .run();
    const [next] = tx
      .insert(items)
      .values({
        programId: row.programId,
        kind: "feature",
        title: input.newTitle,
        description: row.description,
        track: row.track,
        integration: row.integration,
        parentId: input.newParentId,
        milestoneId: input.newParentId ? null : row.milestoneId,
        size,
        pointsOverride: input.newPointsOverride,
        periodIndex: input.newPeriodIndex,
        periodSpan: input.newPeriodSpan,
        splitFromId: row.id,
      })
      .returning({ id: items.id })
      .all();
    return next!.id;
  });
}
