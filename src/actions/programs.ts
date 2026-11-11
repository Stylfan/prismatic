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

function refresh<T>(result: Result<T>): Result<T> {
  if (result.ok) {
    // The sidebar lists every programme by name, so the whole frame refreshes.
    revalidatePath("/", "layout");
  }
  return result;
}

export async function createProgramAction(raw: unknown): Promise<Result<string>> {
  return refresh(await run(ProgramFields, raw, createProgram));
}

export async function updateProgramAction(raw: unknown): Promise<Result<string>> {
  const r = await run(UpdateProgramSchema, raw, async (db, userId, input) => {
    await updateProgram(db, userId, input);
    return input.programId;
  });
  return refresh(r);
}

export async function deleteProgramAction(raw: unknown): Promise<Result<string>> {
  return refresh(
    await run(ProgramIdSchema, raw, async (db, userId, input) => {
      await deleteProgram(db, userId, input.programId);
      return input.programId;
    }),
  );
}

export async function setSizePointsAction(raw: unknown): Promise<Result<string>> {
  const r = await run(SetSizePointsSchema, raw, async (db, userId, input) => {
    await setSizePoints(db, userId, input);
    return input.programId;
  });
  return refresh(r);
}

export async function addMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(NewMilestoneSchema, raw, async (db, userId, input) => {
    await addMilestone(db, userId, input.programId, input.title);
    return input.programId;
  });
  return refresh(r);
}

export async function updateMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(UpdateMilestoneSchema, raw, updateMilestone);
  return refresh(r);
}

export async function setMilestoneDoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(MilestoneDoneSchema, raw, (db, userId, input) =>
    setMilestoneDone(db, userId, input.milestoneId, input.done),
  );
  return refresh(r);
}

export async function moveMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(MoveMilestoneSchema, raw, (db, userId, input) =>
    moveMilestone(db, userId, input.milestoneId, input.direction),
  );
  return refresh(r);
}

export async function removeMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(MilestoneIdSchema, raw, (db, userId, input) =>
    removeMilestone(db, userId, input.milestoneId),
  );
  return refresh(r);
}
