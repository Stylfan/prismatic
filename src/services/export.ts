import { asc, eq, inArray } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "@/db/client";
import {
  auditLog,
  decisionCases,
  decisions,
  items,
  milestones,
  programEvents,
  programSizes,
  programs,
  quarterGoals,
  quarterRecords,
  reportDrafts,
  reportEditions,
  risks,
  users,
} from "@/db/schema";

/**
 * Everything an account owns, for the one-click export (Haij's third
 * rule): the account itself, every programme with all its rows, the
 * published editions and the audit trail. Runs inside withUser(), so
 * row-level security limits it to the account's own programmes even
 * before the owner filter does.
 */

/** The tables that hang off a programme, in the order the export lists them. */
export const PROGRAM_TABLES = {
  sizes: programSizes,
  milestones,
  items,
  events: programEvents,
  quarterRecords,
  risks,
  quarterGoals,
  decisionCases,
  decisions,
  reportDrafts,
  reportEditions,
  auditLog,
} as const satisfies Record<string, PgTable & { programId: unknown }>;

export type TableName = keyof typeof PROGRAM_TABLES | "programs";

export type AccountExport = {
  format: "prismatic-export";
  version: 1;
  exportedAt: string;
  account: { id: string; email: string; name: string; createdAt: number };
  programs: Record<string, unknown>[];
  tables: Record<keyof typeof PROGRAM_TABLES, Record<string, unknown>[]>;
};

export async function exportAccount(tx: Tx, userId: string): Promise<AccountExport> {
  const [account] = await tx
    .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!account) throw new Error("export: no such account");
  const owned = await tx
    .select()
    .from(programs)
    .where(eq(programs.ownerId, userId))
    .orderBy(asc(programs.createdAt));
  const ids = owned.map((p) => p.id);

  const tables = {} as AccountExport["tables"];
  for (const [name, table] of Object.entries(PROGRAM_TABLES) as [
    keyof typeof PROGRAM_TABLES,
    (typeof PROGRAM_TABLES)[keyof typeof PROGRAM_TABLES],
  ][]) {
    const rows: Record<string, unknown>[] =
      ids.length === 0 ? [] : await tx.select().from(table).where(inArray(table.programId, ids));
    // A frozen edition is stored as JSON text; it is exported as JSON, not as a string of it.
    tables[name] =
      name === "reportEditions"
        ? rows.map((r) => ({ ...r, data: JSON.parse(String(r.data)) as unknown }))
        : rows;
  }

  return {
    format: "prismatic-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    account,
    programs: owned,
    tables,
  };
}
