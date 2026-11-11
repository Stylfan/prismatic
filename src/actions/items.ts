"use server";

import { revalidatePath } from "next/cache";
import { arrangeItems, createItem, deleteItem, splitFeature, updateItem } from "@/services/items";
import {
  ItemIdSchema,
  NewItemSchema,
  ArrangeItemsSchema,
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
  const r = await run(NewItemSchema, raw, async (db, userId, input) => {
    await createItem(db, userId, input);
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
  const r = await run(SplitItemSchema, raw, async (db, userId, input) => {
    await splitFeature(db, userId, input);
    return input.itemId;
  });
  // The id here is the item's, not the programme's, so refresh every programme page.
  if (r.ok) revalidatePath("/programs", "layout");
  return r;
}

/** Goals or features in a new order, and moved to where they were dropped. */
export async function arrangeItemsAction(raw: unknown): Promise<Result<string>> {
  const r = await run(ArrangeItemsSchema, raw, arrangeItems);
  return refresh(r, idOf(r));
}
