import { and, asc, count, desc, eq, gt, lt, max } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db/client";
import { milestones, programSizes, programs } from "@/db/schema";
import { defaultSizeRows, type SizeTable } from "@/domain/sizes";
import type {
  ProgramInput,
  SetSizePointsSchema,
  UpdateMilestoneSchema,
  UpdateProgramSchema,
} from "./validation";

/**
 * Programmes, their sizes and milestones. Every function takes the
 * database it works on and the user acting, so the pages use the app's
 * file and the tests a fresh one in memory. A programme belongs to one
 * user: anything that is not theirs is treated as if it does not exist,
 * and throws NotFound. Writes that touch several rows run in one
 * transaction.
 */

export class NotFound extends Error {
  constructor() {
    super("notFound");
  }
}

export function listPrograms(db: Db, userId: string) {
  const rows = db
    .select()
    .from(programs)
    .where(eq(programs.ownerId, userId))
    .orderBy(desc(programs.updatedAt))
    .all();
  const counts = db
    .select({ programId: milestones.programId, n: count() })
    .from(milestones)
    .groupBy(milestones.programId)
    .all();
  return rows.map((p) => ({
    ...p,
    milestoneCount: counts.find((c) => c.programId === p.id)?.n ?? 0,
  }));
}

export function createProgram(db: Db, userId: string, input: ProgramInput): string {
  return db.transaction((tx) => {
    const [row] = tx
      .insert(programs)
      .values({ ...input, ownerId: userId })
      .returning({ id: programs.id })
      .all();
    const programId = row!.id;
    tx.insert(programSizes)
      .values(defaultSizeRows().map((s) => ({ ...s, programId })))
      .run();
    return programId;
  });
}

export function getProgram(db: Db, userId: string, programId: string) {
  const program = db
    .select()
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)))
    .get();
  if (!program) return null;
  const sizes: SizeTable = { feature: {}, goal: {} };
  for (const row of db
    .select()
    .from(programSizes)
    .where(eq(programSizes.programId, programId))
    .all()) {
    sizes[row.level][row.size] = row.points;
  }
  const ms = db
    .select()
    .from(milestones)
    .where(eq(milestones.programId, programId))
    .orderBy(asc(milestones.seq))
    .all();
  return { program, sizes, milestones: ms };
}

export type ProgramFull = NonNullable<ReturnType<typeof getProgram>>;

/** Throws NotFound unless the programme exists and belongs to the user. */
export function requireProgram(db: Db, userId: string, programId: string) {
  const row = db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)))
    .get();
  if (!row) throw new NotFound();
}

export function updateProgram(db: Db, userId: string, input: z.infer<typeof UpdateProgramSchema>) {
  const { programId, ...fields } = input;
  const result = db
    .update(programs)
    .set(fields)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)))
    .run();
  if (result.changes === 0) throw new NotFound();
}

/** Deletes a programme and, through the foreign keys, everything it owns. */
export function deleteProgram(db: Db, userId: string, programId: string) {
  const result = db
    .delete(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)))
    .run();
  if (result.changes === 0) throw new NotFound();
}

export function setSizePoints(db: Db, userId: string, input: z.infer<typeof SetSizePointsSchema>) {
  requireProgram(db, userId, input.programId);
  if (input.level === "feature" && input.size === "XXL") throw new NotFound();
  db.insert(programSizes)
    .values(input)
    .onConflictDoUpdate({
      target: [programSizes.programId, programSizes.level, programSizes.size],
      set: { points: input.points },
    })
    .run();
}

/** The milestone, if it belongs to one of the user's programmes. */
function requireMilestone(db: Db, userId: string, milestoneId: string) {
  const row = db
    .select({ milestone: milestones })
    .from(milestones)
    .innerJoin(programs, eq(programs.id, milestones.programId))
    .where(and(eq(milestones.id, milestoneId), eq(programs.ownerId, userId)))
    .get();
  if (!row) throw new NotFound();
  return row.milestone;
}

export function addMilestone(db: Db, userId: string, programId: string, title: string) {
  requireProgram(db, userId, programId);
  const last = db
    .select({ max: max(milestones.seq) })
    .from(milestones)
    .where(eq(milestones.programId, programId))
    .get();
  db.insert(milestones)
    .values({ programId, title, seq: (last?.max ?? 0) + 1 })
    .run();
}

export function updateMilestone(
  db: Db,
  userId: string,
  input: z.infer<typeof UpdateMilestoneSchema>,
) {
  const row = requireMilestone(db, userId, input.milestoneId);
  db.update(milestones)
    .set({ title: input.title, description: input.description, scopeOverride: input.scopeOverride })
    .where(eq(milestones.id, row.id))
    .run();
  return row.programId;
}

export function setMilestoneDone(db: Db, userId: string, milestoneId: string, done: boolean) {
  const row = requireMilestone(db, userId, milestoneId);
  db.update(milestones)
    .set({ doneAt: done ? Date.now() : null })
    .where(eq(milestones.id, row.id))
    .run();
  return row.programId;
}

/**
 * Swaps a milestone with its neighbour. The unique (programme, seq) index
 * forbids two rows on one number even for a moment, so the moving row
 * parks on a negative number first.
 */
export function moveMilestone(
  db: Db,
  userId: string,
  milestoneId: string,
  direction: "up" | "down",
) {
  const row = requireMilestone(db, userId, milestoneId);
  return db.transaction((tx) => {
    const neighbour = tx
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.programId, row.programId),
          direction === "up" ? lt(milestones.seq, row.seq) : gt(milestones.seq, row.seq),
        ),
      )
      .orderBy(direction === "up" ? desc(milestones.seq) : asc(milestones.seq))
      .get();
    if (!neighbour) return row.programId;
    tx.update(milestones).set({ seq: -row.seq }).where(eq(milestones.id, row.id)).run();
    tx.update(milestones).set({ seq: row.seq }).where(eq(milestones.id, neighbour.id)).run();
    tx.update(milestones).set({ seq: neighbour.seq }).where(eq(milestones.id, row.id)).run();
    return row.programId;
  });
}

/** Removes a milestone and closes the gap, so the numbers stay M1, M2, M3. */
export function removeMilestone(db: Db, userId: string, milestoneId: string) {
  const row = requireMilestone(db, userId, milestoneId);
  return db.transaction((tx) => {
    tx.delete(milestones).where(eq(milestones.id, row.id)).run();
    const later = tx
      .select({ id: milestones.id, seq: milestones.seq })
      .from(milestones)
      .where(and(eq(milestones.programId, row.programId), gt(milestones.seq, row.seq)))
      .orderBy(asc(milestones.seq))
      .all();
    for (const m of later) {
      tx.update(milestones)
        .set({ seq: m.seq - 1 })
        .where(eq(milestones.id, m.id))
        .run();
    }
    return row.programId;
  });
}
