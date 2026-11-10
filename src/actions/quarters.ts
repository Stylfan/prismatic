"use server";

import { revalidatePath } from "next/cache";
import { saveQuarter } from "@/services/quarters";
import { SaveQuarterSchema } from "@/services/validation";
import { run, type Result } from "./result";

/** Saves one quarter of the ledger and refreshes the programme's pages. */
export async function saveQuarterAction(raw: unknown): Promise<Result<string>> {
  const r = await run(SaveQuarterSchema, raw, saveQuarter);
  if (r.ok) revalidatePath(`/programs/${r.data}`, "layout");
  return r;
}
