import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { quarterRecords, type QuarterRecord } from "@/db/schema";
import { requireProgram } from "./programs";

/**
 * The quarter ledger: capacity and hand-typed numbers per quarter. A row
 * that only repeats the defaults (100 %, nothing typed over, no comment)
 * is removed again, so resetting a quarter leaves no trace.
 */

export function listQuarterRecords(db: Db, programId: string): QuarterRecord[] {
  return db
    .select()
    .from(quarterRecords)
    .where(eq(quarterRecords.programId, programId))
    .orderBy(asc(quarterRecords.quarterIndex))
    .all();
}

export type QuarterInput = {
  programId: string;
  quarterIndex: number;
  capacityPct: number;
  deliveredOverride: number | null;
  plannedOverride: number | null;
  comment: string;
};

export function saveQuarter(db: Db, userId: string, input: QuarterInput): string {
  requireProgram(db, userId, input.programId);
  const comment = input.comment.trim();
  const isDefault =
    input.capacityPct === 100 &&
    input.deliveredOverride === null &&
    input.plannedOverride === null &&
    comment === "";
  if (isDefault) {
    db.delete(quarterRecords)
      .where(
        and(
          eq(quarterRecords.programId, input.programId),
          eq(quarterRecords.quarterIndex, input.quarterIndex),
        ),
      )
      .run();
    return input.programId;
  }
  db.insert(quarterRecords)
    .values({ ...input, comment })
    .onConflictDoUpdate({
      target: [quarterRecords.programId, quarterRecords.quarterIndex],
      set: {
        capacityPct: input.capacityPct,
        deliveredOverride: input.deliveredOverride,
        plannedOverride: input.plannedOverride,
        comment,
      },
    })
    .run();
  return input.programId;
}
