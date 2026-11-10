"use server";

import { revalidatePath } from "next/cache";
import { createItem, deleteItem, splitFeature, updateItem } from "@/services/items";
import {
  ItemIdSchema,
  NewItemSchema,
  SplitItemSchema,
  UpdateItemSchema,
} from "@/services/validation";
import { run, type Result } from "./result";

/** Server actions for business goals and features; each refreshes the programme's pages. */

function refresh<T>(result: Result<T>, programId: string | null): Result<T> {
  if (result.ok && programId) revalidatePath(`/programs/${programId}`, "layout");
  return result;
}

const idOf = (r: Result<string>) => (r.ok ? r.data : null);

export async function createItemAction(raw: unknown): Promise<Result<string>> {
  const r = await run(NewItemSchema, raw, (db, userId, input) => {
    createItem(db, userId, input);
    return input.programId;
  });
  return refresh(r, idOf(r));
}

export async function updateItemAction(raw: unknown): Promise<Result<string>> {
  const r = await run(UpdateItemSchema, raw, updateItem);
  return refresh(r, idOf(r));
}

export async function deleteItemAction(raw: unknown): Promise<Result<string>> {
  const r = await run(ItemIdSchema, raw, (db, userId, input) =>
    deleteItem(db, userId, input.itemId),
  );
  return refresh(r, idOf(r));
}

export async function splitFeatureAction(raw: unknown): Promise<Result<string>> {
  const r = await run(SplitItemSchema, raw, (db, userId, input) => {
    splitFeature(db, userId, input);
    return input.itemId;
  });
  // The id here is the item's, not the programme's, so refresh every programme page.
  if (r.ok) revalidatePath("/programs", "layout");
  return r;
}
