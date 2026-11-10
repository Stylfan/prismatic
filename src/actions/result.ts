import type { z } from "zod";
import { getDb, type Db } from "@/db/client";
import { NotFound } from "@/services/programs";

/** Every action answers with one of these; the page never sees a stack trace. */
export type Result<T = undefined> =
  { ok: true; data: T } | { ok: false; error: "invalid" | "notFound" | "generic" };

/**
 * The shape of every server action: validate the payload, run the service
 * against the app's database, turn failures into a word the page can
 * render. Details stay in the server log.
 */
export function run<S extends z.ZodType, T>(
  schema: S,
  raw: unknown,
  fn: (db: Db, input: z.infer<S>) => T,
): Result<T> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid" };
  try {
    return { ok: true, data: fn(getDb(), parsed.data) };
  } catch (error) {
    if (error instanceof NotFound) return { ok: false, error: "notFound" };
    console.error("action failed", error);
    return { ok: false, error: "generic" };
  }
}
