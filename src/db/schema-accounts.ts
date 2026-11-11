import { bigint, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { id, now, timestamps } from "./columns";

/**
 * Accounts and how they sign in: the password hash, sessions, the second
 * factor (TOTP) and its recovery codes, passkeys, and the short-lived
 * challenges the sign-in steps hand out. These rows exist before anyone is
 * known to be signed in, so they sit outside row-level security; the
 * application reaches them only through src/services/users.ts and
 * src/services/factors.ts. Nothing here is audited, so no secret or hash
 * is copied into the audit log.
 */

/** A person who signs in. Passwords are stored only as a scrypt hash (src/auth/password.ts). */
export const users = pgTable(
  "users",
  {
    id: id(),
    /** Stored lower-cased and trimmed, so one address is one account. */
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    /** The TOTP secret, encrypted with PRISMATIC_SECRET (src/auth/secret-box.ts); null when off. */
    totpSecret: text("totp_secret"),
    /** The last 30-second step a code was accepted for, so one code works only once. */
    totpLastStep: bigint("totp_last_step", { mode: "number" }),
    /** A visitor to a demo installation, deleted with everything it made at this time; null for a real account. */
    demoExpiresAt: bigint("demo_expires_at", { mode: "number" }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

/**
 * A signed-in browser. The id is the SHA-256 of the token in the cookie,
 * so a copy of the database does not hand out working sessions.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;

/**
 * A passkey (WebAuthn credential). The id is the credential id the
 * authenticator chose; the public key verifies its signatures, and the
 * counter catches a cloned authenticator.
 */
export const passkeys = pgTable(
  "passkeys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    publicKey: text("public_key").notNull(),
    counter: bigint("counter", { mode: "number" }).notNull().default(0),
    transports: text("transports").notNull().default(""),
    createdAt: bigint("created_at", { mode: "number" }).notNull().$defaultFn(now),
    lastUsedAt: bigint("last_used_at", { mode: "number" }),
  },
  (t) => [index("passkeys_user_idx").on(t.userId)],
);

/** One-time codes for when the authenticator app is lost; only a hash is stored. */
export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: bigint("used_at", { mode: "number" }),
  },
  (t) => [uniqueIndex("recovery_codes_hash_uq").on(t.userId, t.codeHash)],
);

export const CHALLENGE_PURPOSES = [
  "second-factor",
  "totp-setup",
  "passkey-register",
  "passkey-login",
] as const;
export type ChallengePurpose = (typeof CHALLENGE_PURPOSES)[number];

/**
 * A step of a sign-in or set-up that must be finished within minutes: a
 * password accepted and waiting for the code, a TOTP secret waiting for its
 * first code, a WebAuthn challenge waiting for the authenticator. Used once.
 */
export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    purpose: text("purpose", { enum: CHALLENGE_PURPOSES }).notNull(),
    value: text("value").notNull().default(""),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  },
  (t) => [index("auth_challenges_user_idx").on(t.userId)],
);
