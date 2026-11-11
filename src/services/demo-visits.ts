import { randomBytes } from "node:crypto";
import { and, count, gt, isNotNull, lte } from "drizzle-orm";
import { hashPassword } from "@/auth/password";
import { withUser, type Db } from "@/db/client";
import { users } from "@/db/schema";
import { createDemoProgram } from "@/demo/create";
import { isDemoMode } from "@/lib/demo-mode";
import { deleteAccount } from "./users";

/**
 * A demo installation: no real accounts, only visits. A visitor presses
 * one button and gets a throwaway account with its own example programme,
 * without an e-mail or a password. After DEMO_HOURS the account and all it
 * made are deleted the way a person deletes their own account, audit trail
 * included. Turned on with PRISMATIC_DEMO=on.
 */

export const DEMO_HOURS = 24;
/** At most this many visits at once, so a demo server cannot be filled up. */
export const MAX_DEMO_VISITS = 300;

export class DemoFull extends Error {
  constructor() {
    super("demoFull");
  }
}

/** Starts a visit: a throwaway account with the example programme. Returns the account and programme. */
export async function startDemoVisit(
  db: Db,
  now = Date.now(),
): Promise<{ userId: string; programId: string }> {
  const [live] = await db
    .select({ n: count() })
    .from(users)
    .where(and(isNotNull(users.demoExpiresAt), gt(users.demoExpiresAt, now)));
  if ((live?.n ?? 0) >= MAX_DEMO_VISITS) throw new DemoFull();
  const tag = randomBytes(9).toString("base64url").toLowerCase();
  // Nobody knows the address or the password: the visit is reached only through its session.
  const [user] = await db
    .insert(users)
    .values({
      email: `demo-${tag}@demo.invalid`,
      name: "",
      passwordHash: await hashPassword(randomBytes(32).toString("base64url")),
      demoExpiresAt: now + DEMO_HOURS * 3_600_000,
    })
    .returning({ id: users.id });
  const userId = user!.id;
  const programId = await withUser(userId, (tx) => createDemoProgram(tx, userId), db);
  return { userId, programId };
}

/** Deletes every visit whose time is up, each with everything it made. Returns how many. */
export async function cleanExpiredDemos(db: Db, now = Date.now()): Promise<number> {
  const expired = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.demoExpiresAt), lte(users.demoExpiresAt, now)));
  for (const { id } of expired) {
    await withUser(id, (tx) => deleteAccount(tx, id), db);
  }
  return expired.length;
}

let lastClean = 0;
const CLEAN_EVERY_MS = 10 * 60 * 1000;

/** Cleans up at most every ten minutes, from wherever the app happens to be in use. */
export async function maybeCleanDemos(db: Db, now = Date.now()): Promise<void> {
  if (!isDemoMode() || now - lastClean < CLEAN_EVERY_MS) return;
  lastClean = now;
  await cleanExpiredDemos(db, now);
}
