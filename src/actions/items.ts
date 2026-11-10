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

export async function createItemAction(raw: unknown): Promise<Result<string>> {
  const r = run(NewItemSchema, raw, (db, input) => {
    createItem(db, input);
    return input.programId;
  });
  return refresh(r, r.ok ? r.data : null);
}

export async function updateItemAction(raw: unknown): Promise<Result<string>> {
  const r = run(UpdateItemSchema, raw, updateItem);
  return refresh(r, r.ok ? r.data : null);
}

export async function deleteItemAction(raw: unknown): Promise<Result<string>> {
  const r = run(ItemIdSchema, raw, (db, input) => deleteItem(db, input.itemId));
  return refresh(r, r.ok ? r.data : null);
}

export async function splitFeatureAction(raw: unknown): Promise<Result<string>> {
  const r = run(SplitItemSchema, raw, (db, input) => {
    splitFeature(db, input);
    return input.itemId;
  });
  // The page refreshes on its own after a split; the id here is the item's, not the programme's.
  if (r.ok) revalidatePath("/programs", "layout");
  return r;
}
