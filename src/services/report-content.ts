import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  decisionCases,
  decisions,
  programs,
  quarterGoals,
  reportDrafts,
  reportEditions,
  type CaseStatus,
  type DecisionEffect,
  type GoalStatus,
} from "@/db/schema";
import { NotFound, requireProgram } from "./programs";

/**
 * The parts of the report a person writes: quarter goals, cases for
 * decision, the decision log and the report's own texts, plus the
 * published editions. Every row is reached through a programme the acting
 * user owns.
 */

type OwnedTable = typeof quarterGoals | typeof decisionCases | typeof decisions;

/** The programme of a row in one of the report tables, if the user owns it. */
async function ownerProgram(
  db: Db,
  userId: string,
  table: OwnedTable,
  rowId: string,
): Promise<string> {
  const [row] = await db
    .select({ programId: table.programId })
    .from(table)
    .innerJoin(programs, eq(programs.id, table.programId))
    .where(and(eq(table.id, rowId), eq(programs.ownerId, userId)));
  if (!row) throw new NotFound();
  return row.programId;
}

// Quarter goals

export async function listGoals(db: Db, programId: string) {
  return await db
    .select()
    .from(quarterGoals)
    .where(eq(quarterGoals.programId, programId))
    .orderBy(asc(quarterGoals.createdAt));
}

export async function addGoal(
  db: Db,
  userId: string,
  input: {
    programId: string;
    quarterIndex: number;
    title: string;
    parentId: string | null;
    stretch: boolean;
  },
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  if (input.parentId) {
    const parent = await ownerProgram(db, userId, quarterGoals, input.parentId);
    if (parent !== input.programId) throw new NotFound();
  }
  await db.insert(quarterGoals).values(input);
  return input.programId;
}

export async function updateGoal(
  db: Db,
  userId: string,
  input: { goalId: string; title: string; stretch: boolean; status: GoalStatus },
): Promise<string> {
  const programId = await ownerProgram(db, userId, quarterGoals, input.goalId);
  await db
    .update(quarterGoals)
    .set({ title: input.title, stretch: input.stretch, status: input.status })
    .where(eq(quarterGoals.id, input.goalId));
  return programId;
}

export async function deleteGoal(db: Db, userId: string, goalId: string): Promise<string> {
  const programId = await ownerProgram(db, userId, quarterGoals, goalId);
  await db.delete(quarterGoals).where(eq(quarterGoals.id, goalId));
  return programId;
}

// Cases for decision

export async function listCases(db: Db, programId: string) {
  return await db
    .select()
    .from(decisionCases)
    .where(eq(decisionCases.programId, programId))
    .orderBy(asc(decisionCases.createdAt));
}

export async function addCase(db: Db, userId: string, input: { programId: string; title: string }) {
  await requireProgram(db, userId, input.programId);
  await db.insert(decisionCases).values(input);
  return input.programId;
}

export async function updateCase(
  db: Db,
  userId: string,
  input: {
    caseId: string;
    title: string;
    problem: string;
    background: string;
    keyPoints: string;
    nextSteps: string;
    status: CaseStatus;
  },
): Promise<string> {
  const programId = await ownerProgram(db, userId, decisionCases, input.caseId);
  const { caseId, ...fields } = input;
  await db.update(decisionCases).set(fields).where(eq(decisionCases.id, caseId));
  return programId;
}

export async function deleteCase(db: Db, userId: string, caseId: string): Promise<string> {
  const programId = await ownerProgram(db, userId, decisionCases, caseId);
  await db.delete(decisionCases).where(eq(decisionCases.id, caseId));
  return programId;
}

// The decision log

export async function listDecisions(db: Db, programId: string) {
  return await db
    .select()
    .from(decisions)
    .where(eq(decisions.programId, programId))
    .orderBy(asc(decisions.createdAt));
}

export async function addDecision(
  db: Db,
  userId: string,
  input: { programId: string; title: string },
) {
  await requireProgram(db, userId, input.programId);
  await db.insert(decisions).values(input);
  return input.programId;
}

export async function updateDecision(
  db: Db,
  userId: string,
  input: {
    decisionId: string;
    title: string;
    decidedOn: string;
    forum: string;
    decision: string;
    effect: DecisionEffect;
  },
): Promise<string> {
  const programId = await ownerProgram(db, userId, decisions, input.decisionId);
  const { decisionId, ...fields } = input;
  await db.update(decisions).set(fields).where(eq(decisions.id, decisionId));
  return programId;
}

export async function deleteDecision(db: Db, userId: string, decisionId: string): Promise<string> {
  const programId = await ownerProgram(db, userId, decisions, decisionId);
  await db.delete(decisions).where(eq(decisions.id, decisionId));
  return programId;
}

// The report's own texts

/**
 * One quarter's texts. A draft from before reports belonged to a quarter
 * shows under the quarter that is opened first, until a quarter saves it.
 */
export async function getDraft(db: Db, programId: string, quarterIndex: number) {
  const rows = await db.select().from(reportDrafts).where(eq(reportDrafts.programId, programId));
  const own = rows.find((r) => r.quarterIndex === quarterIndex);
  const legacy = rows.find((r) => r.quarterIndex === null);
  const draft = own ?? legacy;
  return {
    programId,
    quarterIndex,
    statusText: draft?.statusText ?? "",
    changeText: draft?.changeText ?? "",
  };
}

export async function saveDraft(
  db: Db,
  userId: string,
  input: { programId: string; quarterIndex: number; statusText: string; changeText: string },
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const texts = { statusText: input.statusText, changeText: input.changeText };
  const rows = await db
    .select({ quarterIndex: reportDrafts.quarterIndex })
    .from(reportDrafts)
    .where(eq(reportDrafts.programId, input.programId));
  // The first quarter saved takes the draft from before quarters, so nothing is lost.
  if (
    !rows.some((r) => r.quarterIndex === input.quarterIndex) &&
    rows.some((r) => r.quarterIndex === null)
  ) {
    await db
      .update(reportDrafts)
      .set({ ...texts, quarterIndex: input.quarterIndex })
      .where(and(eq(reportDrafts.programId, input.programId), isNull(reportDrafts.quarterIndex)));
    return input.programId;
  }
  await db
    .insert(reportDrafts)
    .values({ programId: input.programId, quarterIndex: input.quarterIndex, ...texts })
    .onConflictDoUpdate({
      target: [reportDrafts.programId, reportDrafts.quarterIndex],
      set: texts,
    });
  return input.programId;
}

// Editions

export async function listEditions(db: Db, programId: string) {
  return db
    .select({
      id: reportEditions.id,
      title: reportEditions.title,
      publishedAt: reportEditions.publishedAt,
    })
    .from(reportEditions)
    .where(eq(reportEditions.programId, programId))
    .orderBy(desc(reportEditions.publishedAt));
}

/** The latest edition's frozen data, to compare the present against. */
export async function latestEditionData(db: Db, programId: string): Promise<string | null> {
  const [row] = await db
    .select({ data: reportEditions.data })
    .from(reportEditions)
    .where(eq(reportEditions.programId, programId))
    .orderBy(desc(reportEditions.publishedAt))
    .limit(1);
  return row?.data ?? null;
}

export async function getEdition(db: Db, userId: string, programId: string, editionId: string) {
  await requireProgram(db, userId, programId);
  const [row] = await db
    .select()
    .from(reportEditions)
    .where(and(eq(reportEditions.id, editionId), eq(reportEditions.programId, programId)));
  if (!row) throw new NotFound();
  return row;
}

export async function saveEdition(
  db: Db,
  userId: string,
  input: { programId: string; title: string; data: string; publishedAt?: number },
): Promise<string> {
  await requireProgram(db, userId, input.programId);
  const [row] = await db
    .insert(reportEditions)
    .values({
      programId: input.programId,
      title: input.title,
      data: input.data,
      publishedAt: input.publishedAt ?? Date.now(),
    })
    .returning({ id: reportEditions.id });
  return row!.id;
}
