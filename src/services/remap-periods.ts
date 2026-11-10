import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { items, milestones, programEvents, quarterRecords } from "@/db/schema";
import { quarterIndexOf, quarterStart, type PeriodSettings } from "@/domain/periods";

/**
 * Periods are stored as quarter numbers counted from the programme's first
 * quarter. When the start or the period model changes, the same number
 * would mean another quarter, so everything placed in time is moved to the
 * quarter that holds the date it meant before: cards, closing quarters,
 * milestones, events and the quarter ledger. Runs inside the caller's
 * transaction.
 */
export function remapPeriods(
  tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
  programId: string,
  before: PeriodSettings,
  after: PeriodSettings,
) {
  if (before.model === after.model && before.startDate === after.startDate) return;
  const map = (index: number | null) =>
    index === null ? null : quarterIndexOf(after, quarterStart(before, index));

  for (const row of tx.select().from(items).where(eq(items.programId, programId)).all()) {
    tx.update(items)
      .set({ periodIndex: map(row.periodIndex), doneQuarter: map(row.doneQuarter) })
      .where(eq(items.id, row.id))
      .run();
  }
  for (const row of tx.select().from(milestones).where(eq(milestones.programId, programId)).all()) {
    tx.update(milestones)
      .set({ periodIndex: map(row.periodIndex) })
      .where(eq(milestones.id, row.id))
      .run();
  }
  for (const row of tx
    .select()
    .from(programEvents)
    .where(eq(programEvents.programId, programId))
    .all()) {
    tx.update(programEvents)
      .set({ quarterIndex: map(row.quarterIndex)! })
      .where(eq(programEvents.id, row.id))
      .run();
  }
  // The ledger is keyed by quarter, so its rows are taken out and put back under their new number.
  const records = tx
    .select()
    .from(quarterRecords)
    .where(eq(quarterRecords.programId, programId))
    .all();
  tx.delete(quarterRecords).where(eq(quarterRecords.programId, programId)).run();
  const seen = new Set<number>();
  for (const r of records) {
    const quarterIndex = map(r.quarterIndex)!;
    if (seen.has(quarterIndex)) continue;
    seen.add(quarterIndex);
    tx.insert(quarterRecords)
      .values({ ...r, quarterIndex })
      .run();
  }
}
