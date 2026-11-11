import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { quarterRecords, type QuarterRecord } from "@/db/schema";
import { requireProgram } from "./programs";

/**
 * The quarter ledger: capacity and hand-typed numbers per quarter. A row
 * that only repeats the defaults (100 %, nothing typed over, no comment)
 * is removed again, so resetting a quarter leaves no trace.
 */

export async function listQuarterRecords(db: Db, programId: string): Promise<QuarterRecord[]> {
  return await db
    .select()
    .from(quarterRecords)
    .where(eq(quarterRecords.programId, programId))
    .orderBy(asc(quarterRecords.quarterIndex));
}

export type QuarterInput = {
  programId: string;
  quarterIndex: number;
  capacityPct: number;
  deliveredOverride: number | null;
  plannedOverride: number | null;
  comment: string;
};

export async function saveQuarter(db: Db, userId: string, input: QuarterInput): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const comment = input.comment.trim();
  const isDefault =
    input.capacityPct === 100 &&
    input.deliveredOverride === null &&
    input.plannedOverride === null &&
    comment === "";
  if (isDefault) {
    await db
      .delete(quarterRecords)
      .where(
        and(
          eq(quarterRecords.programId, input.programId),
          eq(quarterRecords.quarterIndex, input.quarterIndex),
        ),
      );
    return input.programId;
  }
  await db
    .insert(quarterRecords)
    .values({ ...input, comment })
    .onConflictDoUpdate({
      target: [quarterRecords.programId, quarterRecords.quarterIndex],
      set: {
        capacityPct: input.capacityPct,
        deliveredOverride: input.deliveredOverride,
        plannedOverride: input.plannedOverride,
        comment,
      },
    });
  return input.programId;
}
