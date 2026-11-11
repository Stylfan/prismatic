import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db/client";
import { items, milestones, programs, type Item } from "@/db/schema";
import { isSizeForLevel } from "@/domain/sizes";
import { NotFound, requireProgram } from "./programs";
import type {
  ArrangeItemsSchema,
  NewItemSchema,
  SplitItemSchema,
  UpdateItemSchema,
} from "./validation";

/**
 * Business goals and features. Links are checked against the programme
 * the item belongs to: a feature's goal must be a goal in the same
 * programme, a milestone must be one of the programme's, and a goal never
 * has a parent. A feature under a goal counts toward the goal's milestone,
 * so its own milestone is cleared. Every item is reached through a
 * programme the acting user owns; anything else throws NotFound.
 */

/** The programme's items. Callers pass a programme they have already checked the user owns. */
export async function listItems(db: Db, programId: string): Promise<Item[]> {
  return await db
    .select()
    .from(items)
    .where(eq(items.programId, programId))
    // Ranked items in their order, then everything else as it was added.
    .orderBy(sql`${items.rank} asc nulls last`, asc(items.createdAt));
}

/**
 * Puts the items of one place in the tree in a new order: a milestone's
 * business goals, or a goal's features (or the features without a goal).
 * The list must hold every item already there; any other item in it, of
 * the same kind and programme, is moved there, so dragging a goal to
 * another milestone or a feature to another goal changes what it belongs
 * to. Anything else throws NotFound and changes nothing.
 */
export async function arrangeItems(
  db: Db,
  userId: string,
  input: z.infer<typeof ArrangeItemsSchema>,
) {
  await requireProgram(db, userId, input.programId);
  const goal = input.kind === "goal";
  if (goal) await checkMilestone(db, input.programId, input.milestoneId);
  else await checkGoal(db, input.programId, input.parentId);
  const mine = and(eq(items.programId, input.programId), eq(items.kind, input.kind));
  const place = goal ? input.milestoneId : input.parentId;
  const column = goal ? items.milestoneId : items.parentId;
  const already = await db
    .select({ id: items.id })
    .from(items)
    .where(and(mine, place === null ? isNull(column) : eq(column, place)));
  const found = await db
    .select({ id: items.id })
    .from(items)
    .where(and(mine, inArray(items.id, input.ids)));
  const unique = new Set(input.ids);
  const known = new Set(found.map((r) => r.id));
  if (
    unique.size !== input.ids.length ||
    known.size !== unique.size ||
    already.some((r) => !unique.has(r.id))
  ) {
    throw new NotFound();
  }
  for (const [rank, id] of input.ids.entries()) {
    const where = eq(items.id, id);
    if (goal) await db.update(items).set({ rank, milestoneId: input.milestoneId }).where(where);
    else if (input.parentId === null)
      await db.update(items).set({ rank, parentId: null }).where(where);
    // A feature under a goal counts toward the goal's milestone, so its own is cleared.
    else
      await db
        .update(items)
        .set({ rank, parentId: input.parentId, milestoneId: null })
        .where(where);
  }
  return input.programId;
}

async function requireItem(db: Db, userId: string, itemId: string): Promise<Item> {
  const [row] = await db
    .select({ item: items })
    .from(items)
    .innerJoin(programs, eq(programs.id, items.programId))
    .where(and(eq(items.id, itemId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
  return row.item;
}

async function checkGoal(db: Db, programId: string, goalId: string | null) {
  if (goalId === null) return;
  const [goal] = await db
    .select({ id: items.id })
    .from(items)
    .where(and(eq(items.id, goalId), eq(items.programId, programId), eq(items.kind, "goal")));
  if (!goal) throw new NotFound();
}

async function checkMilestone(db: Db, programId: string, milestoneId: string | null) {
  if (milestoneId === null) return;
  const [m] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.programId, programId)));
  if (!m) throw new NotFound();
}

export async function createItem(
  db: Db,
  userId: string,
  input: z.infer<typeof NewItemSchema>,
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const parentId = input.kind === "goal" ? null : input.parentId;
  await checkGoal(db, input.programId, parentId);
  await checkMilestone(db, input.programId, input.milestoneId);
  const [row] = await db
    .insert(items)
    .values({
      programId: input.programId,
      kind: input.kind,
      title: input.title,
      parentId,
      milestoneId: parentId ? null : input.milestoneId,
    })
    .returning({ id: items.id });
  return row!.id;
}

export async function updateItem(
  db: Db,
  userId: string,
  input: z.infer<typeof UpdateItemSchema>,
): Promise<string> {
  const row = await requireItem(db, userId, input.itemId);
  const parentId = row.kind === "goal" ? null : input.parentId;
  if (parentId === row.id) throw new NotFound();
  await checkGoal(db, row.programId, parentId);
  await checkMilestone(db, row.programId, input.milestoneId);
  const size = input.size !== null && isSizeForLevel(row.kind, input.size) ? input.size : null;
  const done = input.status === "done";
  await db
    .update(items)
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
    .where(eq(items.id, row.id));
  return row.programId;
}

/** Deletes an item. A deleted goal's features stay, without a goal, so nothing is lost silently. */
export async function deleteItem(db: Db, userId: string, itemId: string): Promise<string> {
  const row = await requireItem(db, userId, itemId);
  await db.delete(items).where(eq(items.id, row.id));
  return row.programId;
}

/**
 * Splits a feature that is partly done: the original closes with the
 * points actually delivered and a note of what is done, and the rest
 * becomes a new feature with its own estimate, which may belong to another
 * goal or to none.
 */
export async function splitFeature(
  db: Db,
  userId: string,
  input: z.infer<typeof SplitItemSchema>,
): Promise<string> {
  const row = await requireItem(db, userId, input.itemId);
  if (row.kind !== "feature") throw new NotFound();
  await checkGoal(db, row.programId, input.newParentId);
  const size =
    input.newSize !== null && isSizeForLevel("feature", input.newSize) ? input.newSize : null;
  return db.transaction(async (tx) => {
    await tx
      .update(items)
      .set({
        status: "done",
        pointsOverride: input.deliveredPoints,
        doneQuarter: input.doneQuarter,
        doneNote: input.doneNote,
      })
      .where(eq(items.id, row.id));
    const [next] = await tx
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
      .returning({ id: items.id });
    return next!.id;
  });
}

/** Moves a card to another period on the roadmap, or to "not yet planned". */
export async function moveItem(
  db: Db,
  userId: string,
  input: { itemId: string; periodIndex: number | null; periodSpan: 1 | 2 },
): Promise<string> {
  const row = await requireItem(db, userId, input.itemId);
  await db
    .update(items)
    .set({ periodIndex: input.periodIndex, periodSpan: input.periodSpan })
    .where(eq(items.id, row.id));
  return row.programId;
}
