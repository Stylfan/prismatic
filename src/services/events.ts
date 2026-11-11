import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { programEvents, programs, type ProgramEvent } from "@/db/schema";
import { NotFound, requireProgram } from "./programs";

/**
 * Events in a quarter — onboarding, a workshop, holidays — shown on the
 * roadmap so a dip or a jump in delivery has its reason beside it.
 */

export async function listEvents(db: Db, programId: string): Promise<ProgramEvent[]> {
  return await db
    .select()
    .from(programEvents)
    .where(eq(programEvents.programId, programId))
    .orderBy(asc(programEvents.quarterIndex), asc(programEvents.createdAt));
}

export async function addEvent(
  db: Db,
  userId: string,
  input: { programId: string; quarterIndex: number; title: string },
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  await db.insert(programEvents).values(input);
  return input.programId;
}

export async function removeEvent(db: Db, userId: string, eventId: string): Promise<string> {
  const [row] = await db
    .select({ event: programEvents })
    .from(programEvents)
    .innerJoin(programs, eq(programs.id, programEvents.programId))
    .where(and(eq(programEvents.id, eventId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
  await db.delete(programEvents).where(eq(programEvents.id, eventId));
  return row.event.programId;
}
