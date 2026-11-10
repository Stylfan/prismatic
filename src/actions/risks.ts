"use server";

import { revalidatePath } from "next/cache";
import { addRisk, deleteRisk, updateRisk } from "@/services/risks";
import { NewRiskSchema, RiskIdSchema, UpdateRiskSchema } from "@/services/validation";
import { run, type Result } from "./result";

/** Server actions for the risk log. */

function refresh<T>(result: Result<T>, programId: string | null): Result<T> {
  if (result.ok && programId) revalidatePath(`/programs/${programId}`, "layout");
  return result;
}

const idOf = (r: Result<string>) => (r.ok ? r.data : null);

export async function addRiskAction(raw: unknown): Promise<Result<string>> {
  const r = await run(NewRiskSchema, raw, addRisk);
  return refresh(r, idOf(r));
}

export async function updateRiskAction(raw: unknown): Promise<Result<string>> {
  const r = await run(UpdateRiskSchema, raw, updateRisk);
  return refresh(r, idOf(r));
}

export async function deleteRiskAction(raw: unknown): Promise<Result<string>> {
  const r = await run(RiskIdSchema, raw, (db, userId, input) =>
    deleteRisk(db, userId, input.riskId),
  );
  return refresh(r, idOf(r));
}
