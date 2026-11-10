import { and, asc, desc, eq } from "drizzle-orm";
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
function ownerProgram(db: Db, userId: string, table: OwnedTable, rowId: string): string {
  const row = db
    .select({ programId: table.programId })
    .from(table)
    .innerJoin(programs, eq(programs.id, table.programId))
    .where(and(eq(table.id, rowId), eq(programs.ownerId, userId)))
    .get();
  if (!row) throw new NotFound();
  return row.programId;
}

// Quarter goals

export function listGoals(db: Db, programId: string) {
  return db
    .select()
    .from(quarterGoals)
    .where(eq(quarterGoals.programId, programId))
    .orderBy(asc(quarterGoals.createdAt))
    .all();
}

export function addGoal(
  db: Db,
  userId: string,
  input: {
    programId: string;
    quarterIndex: number;
    title: string;
    parentId: string | null;
    stretch: boolean;
  },
): string {
  requireProgram(db, userId, input.programId);
  if (input.parentId) {
    const parent = ownerProgram(db, userId, quarterGoals, input.parentId);
    if (parent !== input.programId) throw new NotFound();
  }
  db.insert(quarterGoals).values(input).run();
  return input.programId;
}

export function updateGoal(
  db: Db,
  userId: string,
  input: { goalId: string; title: string; stretch: boolean; status: GoalStatus },
): string {
  const programId = ownerProgram(db, userId, quarterGoals, input.goalId);
  db.update(quarterGoals)
    .set({ title: input.title, stretch: input.stretch, status: input.status })
    .where(eq(quarterGoals.id, input.goalId))
    .run();
  return programId;
}

export function deleteGoal(db: Db, userId: string, goalId: string): string {
  const programId = ownerProgram(db, userId, quarterGoals, goalId);
  db.delete(quarterGoals).where(eq(quarterGoals.id, goalId)).run();
  return programId;
}

// Cases for decision

export function listCases(db: Db, programId: string) {
  return db
    .select()
    .from(decisionCases)
    .where(eq(decisionCases.programId, programId))
    .orderBy(asc(decisionCases.createdAt))
    .all();
}

export function addCase(db: Db, userId: string, input: { programId: string; title: string }) {
  requireProgram(db, userId, input.programId);
  db.insert(decisionCases).values(input).run();
  return input.programId;
}

export function updateCase(
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
): string {
  const programId = ownerProgram(db, userId, decisionCases, input.caseId);
  const { caseId, ...fields } = input;
  db.update(decisionCases).set(fields).where(eq(decisionCases.id, caseId)).run();
  return programId;
}

export function deleteCase(db: Db, userId: string, caseId: string): string {
  const programId = ownerProgram(db, userId, decisionCases, caseId);
  db.delete(decisionCases).where(eq(decisionCases.id, caseId)).run();
  return programId;
}

// The decision log

export function listDecisions(db: Db, programId: string) {
  return db
    .select()
    .from(decisions)
    .where(eq(decisions.programId, programId))
    .orderBy(asc(decisions.createdAt))
    .all();
}

export function addDecision(db: Db, userId: string, input: { programId: string; title: string }) {
  requireProgram(db, userId, input.programId);
  db.insert(decisions).values(input).run();
  return input.programId;
}

export function updateDecision(
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
): string {
  const programId = ownerProgram(db, userId, decisions, input.decisionId);
  const { decisionId, ...fields } = input;
  db.update(decisions).set(fields).where(eq(decisions.id, decisionId)).run();
  return programId;
}

export function deleteDecision(db: Db, userId: string, decisionId: string): string {
  const programId = ownerProgram(db, userId, decisions, decisionId);
  db.delete(decisions).where(eq(decisions.id, decisionId)).run();
  return programId;
}

// The report's own texts

export function getDraft(db: Db, programId: string) {
  return (
    db.select().from(reportDrafts).where(eq(reportDrafts.programId, programId)).get() ?? {
      programId,
      statusText: "",
      changeText: "",
      goalsQuarter: null,
    }
  );
}

export function saveDraft(
  db: Db,
  userId: string,
  input: { programId: string; statusText: string; changeText: string; goalsQuarter: number | null },
): string {
  requireProgram(db, userId, input.programId);
  db.insert(reportDrafts)
    .values(input)
    .onConflictDoUpdate({
      target: reportDrafts.programId,
      set: {
        statusText: input.statusText,
        changeText: input.changeText,
        goalsQuarter: input.goalsQuarter,
      },
    })
    .run();
  return input.programId;
}

// Editions

export function listEditions(db: Db, programId: string) {
  return db
    .select({
      id: reportEditions.id,
      title: reportEditions.title,
      publishedAt: reportEditions.publishedAt,
    })
    .from(reportEditions)
    .where(eq(reportEditions.programId, programId))
    .orderBy(desc(reportEditions.publishedAt))
    .all();
}

/** The latest edition's frozen data, to compare the present against. */
export function latestEditionData(db: Db, programId: string): string | null {
  return (
    db
      .select({ data: reportEditions.data })
      .from(reportEditions)
      .where(eq(reportEditions.programId, programId))
      .orderBy(desc(reportEditions.publishedAt))
      .get()?.data ?? null
  );
}

export function getEdition(db: Db, userId: string, programId: string, editionId: string) {
  requireProgram(db, userId, programId);
  const row = db
    .select()
    .from(reportEditions)
    .where(and(eq(reportEditions.id, editionId), eq(reportEditions.programId, programId)))
    .get();
  if (!row) throw new NotFound();
  return row;
}

export function saveEdition(
  db: Db,
  userId: string,
  input: { programId: string; title: string; data: string; publishedAt?: number },
): string {
  requireProgram(db, userId, input.programId);
  const [row] = db
    .insert(reportEditions)
    .values({
      programId: input.programId,
      title: input.title,
      data: input.data,
      publishedAt: input.publishedAt ?? Date.now(),
    })
    .returning({ id: reportEditions.id })
    .all();
  return row!.id;
}
