import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/auth/password";
import type { Db } from "@/db/client";
import { programs, sessions, users, type User } from "@/db/schema";

/**
 * Accounts and sessions. Sign-up is open for the very first account, which
 * also takes over any programme created before accounts existed; after that
 * it is closed unless PRISMATIC_SIGNUP=open. Sessions are random tokens of
 * which only the SHA-256 is stored.
 */

export const SESSION_DAYS = 30;

export class SignupClosed extends Error {
  constructor() {
    super("signupClosed");
  }
}

export class EmailTaken extends Error {
  constructor() {
    super("emailTaken");
  }
}

const normalize = (email: string) => email.trim().toLowerCase();
const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

export function signupOpen(db: Db, setting = process.env.PRISMATIC_SIGNUP): boolean {
  if (setting === "open") return true;
  const row = db.select({ n: count() }).from(users).get();
  return (row?.n ?? 0) === 0;
}

export async function registerUser(
  db: Db,
  input: { email: string; name: string; password: string },
  setting = process.env.PRISMATIC_SIGNUP,
): Promise<User> {
  if (!signupOpen(db, setting)) throw new SignupClosed();
  const email = normalize(input.email);
  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    throw new EmailTaken();
  }
  const passwordHash = await hashPassword(input.password);
  return db.transaction((tx) => {
    const first = (tx.select({ n: count() }).from(users).get()?.n ?? 0) === 0;
    const [user] = tx
      .insert(users)
      .values({ email, name: input.name.trim(), passwordHash })
      .returning()
      .all();
    // Programmes made before there were accounts belong to whoever signs up first.
    if (first) tx.update(programs).set({ ownerId: user!.id }).where(isNull(programs.ownerId)).run();
    return user!;
  });
}

/** The user for an e-mail and password, or null. Always runs a hash, so timing says nothing. */
export async function authenticate(db: Db, email: string, password: string): Promise<User | null> {
  const user = db
    .select()
    .from(users)
    .where(eq(users.email, normalize(email)))
    .get();
  const ok = await verifyPassword(
    password,
    user?.passwordHash ??
      "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  );
  return user && ok ? user : null;
}

export function createSession(db: Db, userId: string, now = Date.now()): string {
  const token = randomBytes(32).toString("base64url");
  db.insert(sessions)
    .values({ id: tokenHash(token), userId, expiresAt: now + SESSION_DAYS * 86_400_000 })
    .run();
  return token;
}

export function userForSession(db: Db, token: string, now = Date.now()): User | null {
  const row = db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, tokenHash(token)), gt(sessions.expiresAt, now)))
    .get();
  return row?.user ?? null;
}

export function deleteSession(db: Db, token: string) {
  db.delete(sessions)
    .where(eq(sessions.id, tokenHash(token)))
    .run();
}
