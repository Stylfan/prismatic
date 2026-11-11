import { and, eq, inArray } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db/client";
import { items, milestones } from "@/db/schema";
import { NotFound, requireProgram } from "./programs";
import type { ArrangeBoardSchema } from "./validation";

/**
 * Arranges one column of the roadmap after a drop: the item or milestone
 * that was moved gets the column's period, and the column's list gets its
 * new order. Only the moved one changes period, so an overdue card that
 * merely stands in the first column keeps the quarter it was planned for.
 * Every id must belong to the programme and be of the kind named, and the
 * moved one must be in the list; anything else throws NotFound.
 */
export async function arrangeBoard(
  db: Db,
  userId: string,
  input: z.infer<typeof ArrangeBoardSchema>,
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const table = input.kind === "item" ? items : milestones;
  const found = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.programId, input.programId), inArray(table.id, input.ids)));
  if (
    new Set(input.ids).size !== input.ids.length ||
    found.length !== input.ids.length ||
    !input.ids.includes(input.movedId)
  ) {
    throw new NotFound();
  }
  const period = { periodIndex: input.periodIndex, periodSpan: input.periodSpan };
  if (input.kind === "item") {
    await db.update(items).set(period).where(eq(items.id, input.movedId));
    for (const [boardRank, id] of input.ids.entries())
      await db.update(items).set({ boardRank }).where(eq(items.id, id));
  } else {
    await db.update(milestones).set(period).where(eq(milestones.id, input.movedId));
    for (const [boardRank, id] of input.ids.entries())
      await db.update(milestones).set({ boardRank }).where(eq(milestones.id, id));
  }
  return input.programId;
}
