"use server";

import { revalidatePath } from "next/cache";
import {
  addMilestone,
  createProgram,
  deleteProgram,
  moveMilestone,
  removeMilestone,
  setMilestoneDone,
  setSizePoints,
  updateMilestone,
  updateProgram,
} from "@/services/programs";
import {
  MilestoneDoneSchema,
  MilestoneIdSchema,
  MoveMilestoneSchema,
  NewMilestoneSchema,
  ProgramFields,
  ProgramIdSchema,
  SetSizePointsSchema,
  UpdateMilestoneSchema,
  UpdateProgramSchema,
} from "@/services/validation";
import { run, type Result } from "./result";

/** The programme pages' server actions; each refreshes the pages its change shows on. */

function refresh<T>(result: Result<T>, programId?: string | null): Result<T> {
  if (result.ok) {
    revalidatePath("/");
    if (programId) revalidatePath(`/programs/${programId}`);
  }
  return result;
}

const idOf = (r: Result<string>) => (r.ok ? r.data : null);

export async function createProgramAction(raw: unknown): Promise<Result<string>> {
  return refresh(run(ProgramFields, raw, createProgram));
}

export async function updateProgramAction(raw: unknown): Promise<Result<string>> {
  const r = run(UpdateProgramSchema, raw, (db, input) => {
    updateProgram(db, input);
    return input.programId;
  });
  return refresh(r, idOf(r));
}

export async function deleteProgramAction(raw: unknown): Promise<Result<string>> {
  return refresh(
    run(ProgramIdSchema, raw, (db, input) => {
      deleteProgram(db, input.programId);
      return input.programId;
    }),
  );
}

export async function setSizePointsAction(raw: unknown): Promise<Result<string>> {
  const r = run(SetSizePointsSchema, raw, (db, input) => {
    setSizePoints(db, input);
    return input.programId;
  });
  return refresh(r, idOf(r));
}

export async function addMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = run(NewMilestoneSchema, raw, (db, input) => {
    addMilestone(db, input.programId, input.title);
    return input.programId;
  });
  return refresh(r, idOf(r));
}

export async function updateMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = run(UpdateMilestoneSchema, raw, updateMilestone);
  return refresh(r, idOf(r));
}

export async function setMilestoneDoneAction(raw: unknown): Promise<Result<string>> {
  const r = run(MilestoneDoneSchema, raw, (db, input) =>
    setMilestoneDone(db, input.milestoneId, input.done),
  );
  return refresh(r, idOf(r));
}

export async function moveMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = run(MoveMilestoneSchema, raw, (db, input) =>
    moveMilestone(db, input.milestoneId, input.direction),
  );
  return refresh(r, idOf(r));
}

export async function removeMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = run(MilestoneIdSchema, raw, (db, input) => removeMilestone(db, input.milestoneId));
  return refresh(r, idOf(r));
}
