import { and, asc, count, desc, eq, gt, lt, max } from "drizzle-orm";
import type { z } from "zod";
import type { Db } from "@/db/client";
import { milestones, programSizes, programs } from "@/db/schema";
import { defaultSizeRows, type SizeTable } from "@/domain/sizes";
import { remapPeriods } from "./remap-periods";
import type {
  ProgramInput,
  SetSizePointsSchema,
  UpdateMilestoneSchema,
  UpdateProgramSchema,
} from "./validation";

/**
 * Programmes, their sizes and milestones. Every function takes the
 * database it works on and the user acting: the pages a transaction from
 * withUser(), the tests the test database. A programme belongs to one
 * user: anything that is not theirs is treated as if it does not exist,
 * and throws NotFound. Writes that touch several rows run in one
 * transaction.
 */

export class NotFound extends Error {
  constructor() {
    super("notFound");
  }
}

export async function listPrograms(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(programs)
    .where(eq(programs.ownerId, userId))
    .orderBy(desc(programs.updatedAt));
  const counts = await db
    .select({ programId: milestones.programId, n: count() })
    .from(milestones)
    .groupBy(milestones.programId);
  return rows.map((p) => ({
    ...p,
    milestoneCount: counts.find((c) => c.programId === p.id)?.n ?? 0,
  }));
}

export async function createProgram(db: Db, userId: string, input: ProgramInput): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(programs)
      .values({ ...input, ownerId: userId })
      .returning({ id: programs.id });
    const programId = row!.id;
    await tx.insert(programSizes).values(defaultSizeRows().map((s) => ({ ...s, programId })));
    return programId;
  });
}

export async function getProgram(db: Db, userId: string, programId: string) {
  const [program] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)));
  if (!program) return null;
  const sizes: SizeTable = { feature: {}, goal: {} };
  for (const row of await db
    .select()
    .from(programSizes)
    .where(eq(programSizes.programId, programId))) {
    sizes[row.level][row.size] = row.points;
  }
  const ms = await db
    .select()
    .from(milestones)
    .where(eq(milestones.programId, programId))
    .orderBy(asc(milestones.seq));
  return { program, sizes, milestones: ms };
}

export type ProgramFull = NonNullable<Awaited<ReturnType<typeof getProgram>>>;

/** Throws NotFound unless the programme exists and belongs to the user. */
export async function requireProgram(db: Db, userId: string, programId: string) {
  const [row] = await db
    .select({ id: programs.id })
    .from(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
}

export async function updateProgram(
  db: Db,
  userId: string,
  input: z.input<typeof UpdateProgramSchema>,
) {
  const { programId, ...fields } = input;
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ model: programs.periodModel, startDate: programs.startDate })
      .from(programs)
      .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)));
    if (!before) throw new NotFound();
    await tx.update(programs).set(fields).where(eq(programs.id, programId));
    // A new start or model would give the stored quarter numbers another meaning.
    await remapPeriods(tx, programId, before, {
      model: fields.periodModel,
      startDate: fields.startDate,
    });
  });
}

/** Deletes a programme and, through the foreign keys, everything it owns. */
export async function deleteProgram(db: Db, userId: string, programId: string) {
  const result = await db
    .delete(programs)
    .where(and(eq(programs.id, programId), eq(programs.ownerId, userId)));
  if (result.rowCount === 0) throw new NotFound();
}

export async function setSizePoints(
  db: Db,
  userId: string,
  input: z.infer<typeof SetSizePointsSchema>,
) {
  await requireProgram(db, userId, input.programId);
  if (input.level === "feature" && input.size === "XXL") throw new NotFound();
  await db
    .insert(programSizes)
    .values(input)
    .onConflictDoUpdate({
      target: [programSizes.programId, programSizes.level, programSizes.size],
      set: { points: input.points },
    });
}

/** The milestone, if it belongs to one of the user's programmes. */
async function requireMilestone(db: Db, userId: string, milestoneId: string) {
  const [row] = await db
    .select({ milestone: milestones })
    .from(milestones)
    .innerJoin(programs, eq(programs.id, milestones.programId))
    .where(and(eq(milestones.id, milestoneId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
  return row.milestone;
}

export async function addMilestone(db: Db, userId: string, programId: string, title: string) {
  await requireProgram(db, userId, programId);
  const [last] = await db
    .select({ max: max(milestones.seq) })
    .from(milestones)
    .where(eq(milestones.programId, programId));
  await db.insert(milestones).values({ programId, title, seq: (last?.max ?? 0) + 1 });
}

export async function updateMilestone(
  db: Db,
  userId: string,
  input: z.infer<typeof UpdateMilestoneSchema>,
) {
  const row = await requireMilestone(db, userId, input.milestoneId);
  await db
    .update(milestones)
    .set({ title: input.title, description: input.description, scopeOverride: input.scopeOverride })
    .where(eq(milestones.id, row.id));
  return row.programId;
}

export async function setMilestoneDone(db: Db, userId: string, milestoneId: string, done: boolean) {
  const row = await requireMilestone(db, userId, milestoneId);
  await db
    .update(milestones)
    .set({ doneAt: done ? Date.now() : null })
    .where(eq(milestones.id, row.id));
  return row.programId;
}

/**
 * Swaps a milestone with its neighbour. The unique (programme, seq) index
 * forbids two rows on one number even for a moment, so the moving row
 * parks on a negative number first.
 */
export async function moveMilestone(
  db: Db,
  userId: string,
  milestoneId: string,
  direction: "up" | "down",
) {
  const row = await requireMilestone(db, userId, milestoneId);
  return db.transaction(async (tx) => {
    const [neighbour] = await tx
      .select()
      .from(milestones)
      .where(
        and(
          eq(milestones.programId, row.programId),
          direction === "up" ? lt(milestones.seq, row.seq) : gt(milestones.seq, row.seq),
        ),
      )
      .orderBy(direction === "up" ? desc(milestones.seq) : asc(milestones.seq));
    if (!neighbour) return row.programId;
    await tx.update(milestones).set({ seq: -row.seq }).where(eq(milestones.id, row.id));
    await tx.update(milestones).set({ seq: row.seq }).where(eq(milestones.id, neighbour.id));
    await tx.update(milestones).set({ seq: neighbour.seq }).where(eq(milestones.id, row.id));
    return row.programId;
  });
}

/** Removes a milestone and closes the gap, so the numbers stay M1, M2, M3. */
export async function removeMilestone(db: Db, userId: string, milestoneId: string) {
  const row = await requireMilestone(db, userId, milestoneId);
  return db.transaction(async (tx) => {
    await tx.delete(milestones).where(eq(milestones.id, row.id));
    const later = await tx
      .select({ id: milestones.id, seq: milestones.seq })
      .from(milestones)
      .where(and(eq(milestones.programId, row.programId), gt(milestones.seq, row.seq)))
      .orderBy(asc(milestones.seq));
    for (const m of later) {
      await tx
        .update(milestones)
        .set({ seq: m.seq - 1 })
        .where(eq(milestones.id, m.id));
    }
    return row.programId;
  });
}

/** Places a milestone in a column on the roadmap; the manager decides where, not the forecast. */
export async function placeMilestone(
  db: Db,
  userId: string,
  input: { milestoneId: string; periodIndex: number | null; periodSpan: 1 | 2 },
) {
  const row = await requireMilestone(db, userId, input.milestoneId);
  await db
    .update(milestones)
    .set({ periodIndex: input.periodIndex, periodSpan: input.periodSpan })
    .where(eq(milestones.id, row.id));
  return row.programId;
}
