import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import { createItem } from "@/services/items";
import { addMilestone, createProgram, getProgram, listPrograms } from "@/services/programs";
import { addRisk } from "@/services/risks";
import { deleteAccount } from "@/services/users";
import { appDb, failure, freshDb, ownerDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The database itself keeps one account's programmes from another (Haij's
 * sixth rule). These tests connect as prismatic_app, the role the
 * application uses, and go around the services with raw SQL: even code
 * that forgot its ownership check could not reach another account's rows.
 */

const CHILD_TABLES = [
  "program_sizes",
  "milestones",
  "items",
  "program_events",
  "quarter_records",
  "risks",
  "quarter_goals",
  "decision_cases",
  "decisions",
  "report_drafts",
  "report_editions",
];

let alice: string;
let bob: string;
let programId: string;

const asAlice = <T>(fn: Parameters<typeof withUser<T>>[1]) => withUser(alice, fn, appDb());
const asBob = <T>(fn: Parameters<typeof withUser<T>>[1]) => withUser(bob, fn, appDb());

const count = async (rows: { rows: unknown[] }) => rows.rows.length;

beforeEach(async () => {
  const db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  programId = await asAlice((tx) =>
    createProgram(tx, alice, {
      name: "Alices program",
      goal: "",
      periodModel: "seasons",
      startDate: "2025-09-01",
      quarterHorizon: 2,
      costPerQuarter: null,
      deviationPct: 10,
    }),
  );
  await asAlice(async (tx) => {
    await addMilestone(tx, alice, programId, "M1");
    await createItem(tx, alice, {
      programId,
      kind: "feature",
      title: "Hemmelig feature",
      parentId: null,
      milestoneId: null,
    });
    await addRisk(tx, alice, { programId, title: "Hemmelig risiko" });
  });
});

describe("row-level security", () => {
  it("is forced on every table that holds programme data", async () => {
    const { rows } = await ownerDb().execute<{ relname: string; forced: boolean }>(sql`
      select c.relname, c.relrowsecurity and c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and c.relname not in ('users', 'sessions')`);
    expect(rows.length).toBe(CHILD_TABLES.length + 2); // + programs, audit_log
    expect(rows.filter((r) => !r.forced).map((r) => r.relname)).toEqual([]);
  });

  it("lets the owner see her own rows", async () => {
    expect(await asAlice(async (tx) => count(await tx.execute(sql`select id from items`)))).toBe(1);
  });

  it("shows another account nothing, table by table", async () => {
    await asBob(async (tx) => {
      expect(await count(await tx.execute(sql`select id from programs`))).toBe(0);
      for (const table of CHILD_TABLES) {
        const result = await tx.execute(sql`select * from ${sql.identifier(table)}`);
        expect(result.rows, table).toEqual([]);
      }
    });
  });

  it("shows nothing when no user is set", async () => {
    const result = await appDb().execute(sql`select id from programs`);
    expect(result.rows).toEqual([]);
  });

  it("does not let another account change or delete the rows", async () => {
    await asBob(async (tx) => {
      const renamed = await tx.execute(
        sql`update programs set name = 'Kapret' where id = ${programId}`,
      );
      expect(renamed.rowCount).toBe(0);
      const removed = await tx.execute(sql`delete from items where program_id = ${programId}`);
      expect(removed.rowCount).toBe(0);
    });
    const full = await asAlice((tx) => getProgram(tx, alice, programId));
    expect(full!.program.name).toBe("Alices program");
  });

  it("does not let another account add rows to the programme", async () => {
    expect(
      await failure(
        asBob((tx) =>
          tx.execute(
            sql`insert into milestones (id, program_id, seq, title) values ('x', ${programId}, 9, 'Ind')`,
          ),
        ),
      ),
    ).toMatch(/row-level security/);
    expect(
      await failure(
        asBob((tx) =>
          tx.execute(
            sql`insert into programs (id, owner_id, name, start_date) values ('y', ${alice}, 'Falsk', '2025-09-01')`,
          ),
        ),
      ),
    ).toMatch(/row-level security/);
  });

  it("holds through the services too", async () => {
    expect(await asBob((tx) => listPrograms(tx, bob))).toEqual([]);
    expect(await asBob((tx) => getProgram(tx, bob, programId))).toBeNull();
  });
});

describe("the audit log", () => {
  it("records every change with the acting account", async () => {
    const { rows } = await ownerDb().execute<{ table_name: string; actor_user_id: string }>(
      sql`select table_name, actor_user_id from audit_log where program_id = ${programId}`,
    );
    expect(new Set(rows.map((r) => r.table_name))).toEqual(
      new Set(["programs", "program_sizes", "milestones", "items", "risks"]),
    );
    expect(rows.every((r) => r.actor_user_id === alice)).toBe(true);
  });

  it("can be read only for one's own programmes", async () => {
    expect(
      await asAlice(async (tx) => count(await tx.execute(sql`select id from audit_log`))),
    ).toBeGreaterThan(0);
    expect(await asBob(async (tx) => count(await tx.execute(sql`select id from audit_log`)))).toBe(
      0,
    );
  });

  it("cannot be changed or emptied by the application", async () => {
    expect(
      await failure(asAlice((tx) => tx.execute(sql`update audit_log set table_name = 'x'`))),
    ).toMatch(/permission denied/);
    expect(await failure(asAlice((tx) => tx.execute(sql`delete from audit_log`)))).toMatch(
      /permission denied/,
    );
  });

  it("cannot be changed or emptied even by the database owner", async () => {
    const owner = ownerDb();
    expect(await failure(owner.execute(sql`update audit_log set table_name = 'x'`))).toMatch(
      /append-only/,
    );
    expect(await failure(owner.execute(sql`delete from audit_log`))).toMatch(/append-only/);
    expect(await failure(owner.execute(sql`truncate audit_log`))).toMatch(/append-only/);
  });
});

describe("deleting an account", () => {
  it("is refused for anyone but the account itself", async () => {
    expect(await failure(asBob((tx) => deleteAccount(tx, alice)))).toMatch(/not the signed-in/);
  });

  it("removes the account, its programmes and their audit trail, and nothing else", async () => {
    await asAlice((tx) => deleteAccount(tx, alice));
    const owner = ownerDb();
    const left = async (q: ReturnType<typeof sql>) => (await owner.execute(q)).rows.length;
    expect(await left(sql`select id from users where id = ${alice}`)).toBe(0);
    expect(await left(sql`select id from programs`)).toBe(0);
    expect(await left(sql`select id from items`)).toBe(0);
    expect(await left(sql`select id from audit_log where program_id = ${programId}`)).toBe(0);
    expect(await left(sql`select id from users where id = ${bob}`)).toBe(1);
  });
});
