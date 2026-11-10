import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { programEvents, programs, type ProgramEvent } from "@/db/schema";
import { NotFound, requireProgram } from "./programs";

/**
 * Events in a quarter — onboarding, a workshop, holidays — shown on the
 * roadmap so a dip or a jump in delivery has its reason beside it.
 */

export function listEvents(db: Db, programId: string): ProgramEvent[] {
  return db
    .select()
    .from(programEvents)
    .where(eq(programEvents.programId, programId))
    .orderBy(asc(programEvents.quarterIndex), asc(programEvents.createdAt))
    .all();
}

export function addEvent(
  db: Db,
  userId: string,
  input: { programId: string; quarterIndex: number; title: string },
): string {
  requireProgram(db, userId, input.programId);
  db.insert(programEvents).values(input).run();
  return input.programId;
}

export function removeEvent(db: Db, userId: string, eventId: string): string {
  const row = db
    .select({ event: programEvents })
    .from(programEvents)
    .innerJoin(programs, eq(programs.id, programEvents.programId))
    .where(and(eq(programEvents.id, eventId), eq(programs.ownerId, userId)))
    .get();
  if (!row) throw new NotFound();
  db.delete(programEvents).where(eq(programEvents.id, eventId)).run();
  return row.event.programId;
}
