import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

/**
 * The database is one file, `data/prismatic.db` unless PRISMATIC_DB says
 * otherwise. Opening it applies any migration it has not seen yet, so a
 * fresh checkout needs no setup step: start the app and the file appears.
 */

export type Db = BetterSQLite3Database<typeof schema>;

export const DEFAULT_DB_PATH = join(process.cwd(), "data", "prismatic.db");

export function openDb(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  // Cascading deletes depend on this, and SQLite leaves it off by default.
  sqlite.pragma("foreign_keys = ON");
  if (path !== ":memory:") sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
  return db;
}

// One connection per server process, kept across hot reloads in development.
const globalForDb = globalThis as unknown as { prismaticDb?: Db };

export function getDb(): Db {
  globalForDb.prismaticDb ??= openDb(process.env.PRISMATIC_DB ?? DEFAULT_DB_PATH);
  return globalForDb.prismaticDb;
}
