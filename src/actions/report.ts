"use server";

import { revalidatePath } from "next/cache";
import { buildReportData, freeze, previousEdition } from "@/lib/report-data";
import { getProgram, NotFound } from "@/services/programs";
import {
  addCase,
  addDecision,
  addGoal,
  deleteCase,
  deleteDecision,
  deleteGoal,
  saveDraft,
  saveEdition,
  updateCase,
  updateDecision,
  updateGoal,
} from "@/services/report-content";
import {
  CaseIdSchema,
  DecisionIdSchema,
  GoalIdSchema,
  NewGoalSchema,
  NewTitledSchema,
  PublishSchema,
  SaveDraftSchema,
  UpdateCaseSchema,
  UpdateDecisionSchema,
  UpdateGoalSchema,
} from "@/services/validation";
import { run, type Result } from "./result";

/** Server actions for the report's own content and for publishing an edition. */

function refresh(r: Result<string>): Result<string> {
  if (r.ok) revalidatePath(`/programs/${r.data}`, "layout");
  return r;
}

export async function addGoalAction(raw: unknown) {
  return refresh(await run(NewGoalSchema, raw, addGoal));
}
export async function updateGoalAction(raw: unknown) {
  return refresh(await run(UpdateGoalSchema, raw, updateGoal));
}
export async function deleteGoalAction(raw: unknown) {
  return refresh(await run(GoalIdSchema, raw, (db, u, i) => deleteGoal(db, u, i.goalId)));
}

export async function addCaseAction(raw: unknown) {
  return refresh(await run(NewTitledSchema, raw, addCase));
}
export async function updateCaseAction(raw: unknown) {
  return refresh(await run(UpdateCaseSchema, raw, updateCase));
}
export async function deleteCaseAction(raw: unknown) {
  return refresh(await run(CaseIdSchema, raw, (db, u, i) => deleteCase(db, u, i.caseId)));
}

export async function addDecisionAction(raw: unknown) {
  return refresh(await run(NewTitledSchema, raw, addDecision));
}
export async function updateDecisionAction(raw: unknown) {
  return refresh(await run(UpdateDecisionSchema, raw, updateDecision));
}
export async function deleteDecisionAction(raw: unknown) {
  return refresh(
    await run(DecisionIdSchema, raw, (db, u, i) => deleteDecision(db, u, i.decisionId)),
  );
}

export async function saveDraftAction(raw: unknown) {
  return refresh(await run(SaveDraftSchema, raw, saveDraft));
}

/**
 * Publishes the report as it stands: built from the programme now, compared
 * with the latest edition, frozen as JSON. Answers with the edition's id.
 */
export async function publishAction(raw: unknown): Promise<Result<string>> {
  const r = await run(PublishSchema, raw, async (db, userId, input) => {
    const full = getProgram(db, userId, input.programId);
    if (!full) throw new NotFound();
    const data = freeze(previousEdition(db, input.programId), await buildReportData(db, full));
    return saveEdition(db, userId, {
      programId: input.programId,
      title: input.title,
      data: JSON.stringify(data),
    });
  });
  if (r.ok) revalidatePath("/programs", "layout");
  return r;
}
