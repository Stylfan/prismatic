"use server";

import { revalidatePath } from "next/cache";
import { arrangeBoard } from "@/services/board";
import { addEvent, removeEvent } from "@/services/events";
import { moveItem } from "@/services/items";
import { placeMilestone } from "@/services/programs";
import {
  ArrangeBoardSchema,
  EventIdSchema,
  MoveItemSchema,
  NewEventSchema,
  PlaceMilestoneSchema,
} from "@/services/validation";
import { run, type Result } from "./result";

/** Moving cards and milestones on the roadmap, and the events in its quarters. */

function refresh<T>(result: Result<T>, programId: string | null): Result<T> {
  if (result.ok && programId) revalidatePath(`/programs/${programId}`, "layout");
  return result;
}

const idOf = (r: Result<string>) => (r.ok ? r.data : null);

export async function moveItemAction(raw: unknown): Promise<Result<string>> {
  const r = await run(MoveItemSchema, raw, moveItem);
  return refresh(r, idOf(r));
}

export async function placeMilestoneAction(raw: unknown): Promise<Result<string>> {
  const r = await run(PlaceMilestoneSchema, raw, placeMilestone);
  return refresh(r, idOf(r));
}

/** A card or milestone dropped in a column, at a place among the others there. */
export async function arrangeBoardAction(raw: unknown): Promise<Result<string>> {
  const r = await run(ArrangeBoardSchema, raw, arrangeBoard);
  return refresh(r, idOf(r));
}

export async function addEventAction(raw: unknown): Promise<Result<string>> {
  const r = await run(NewEventSchema, raw, addEvent);
  return refresh(r, idOf(r));
}

export async function removeEventAction(raw: unknown): Promise<Result<string>> {
  const r = await run(EventIdSchema, raw, (db, userId, input) =>
    removeEvent(db, userId, input.eventId),
  );
  return refresh(r, idOf(r));
}
