import { crc32, inflateRawSync } from "node:zlib";
import { beforeEach, describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import { exportWorkbook } from "@/lib/export-workbook";
import { PROGRAM_TABLES, exportAccount, type TableName } from "@/services/export";
import { createItem } from "@/services/items";
import { addMilestone, createProgram } from "@/services/programs";
import { saveEdition } from "@/services/report-content";
import { appDb, freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The one-click export holds everything the account owns and nothing of
 * anyone else's, and the spreadsheet is a ZIP a reader that did not write
 * it can take apart, every CRC checked.
 */

/** Reads every entry of a ZIP through its central directory and checks each CRC. */
function unzip(buffer: Buffer): Map<string, string> {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    expect(buffer.readUInt32LE(at)).toBe(0x02014b50);
    const method = buffer.readUInt16LE(at + 10);
    const crc = buffer.readUInt32LE(at + 16);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extra = buffer.readUInt16LE(at + 30);
    const comment = buffer.readUInt16LE(at + 32);
    const local = buffer.readUInt32LE(at + 42);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    expect(crc32(data) >>> 0, name).toBe(crc);
    files.set(name, data.toString("utf8"));
    at += 46 + nameLength + extra + comment;
  }
  return files;
}

let alice: string;
let bob: string;
let programId: string;

const settings = {
  goal: "",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 2,
  costPerQuarter: null,
  deviationPct: 10,
};

beforeEach(async () => {
  const db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  programId = await withUser(
    alice,
    async (tx) => {
      const id = await createProgram(tx, alice, { ...settings, name: "Alices program" });
      await addMilestone(tx, alice, id, "M1");
      await createItem(tx, alice, {
        programId: id,
        kind: "feature",
        title: "Login & <adgang>",
        parentId: null,
        milestoneId: null,
      });
      await saveEdition(tx, alice, { programId: id, title: "Udgave 1", data: '{"x":1}' });
      return id;
    },
    appDb(),
  );
  await withUser(
    bob,
    (tx) => createProgram(tx, bob, { ...settings, name: "Bobs program" }),
    appDb(),
  );
});

describe("the export", () => {
  it("holds the account's programmes, their rows and the audit trail", async () => {
    const data = await withUser(alice, (tx) => exportAccount(tx, alice), appDb());
    expect(data.account.email).toBe("alice@example.com");
    expect(data.programs.map((p) => p.name)).toEqual(["Alices program"]);
    expect(data.tables.items.map((i) => i.title)).toEqual(["Login & <adgang>"]);
    expect(data.tables.milestones).toHaveLength(1);
    expect(data.tables.reportEditions[0]!.data).toEqual({ x: 1 });
    expect(data.tables.auditLog.length).toBeGreaterThan(0);
    const everyRow = Object.values(data.tables).flat();
    expect(everyRow.every((r) => r.programId === programId)).toBe(true);
  });

  it("holds nothing of another account's", async () => {
    const data = await withUser(bob, (tx) => exportAccount(tx, bob), appDb());
    expect(data.programs.map((p) => p.name)).toEqual(["Bobs program"]);
    expect(JSON.stringify(data)).not.toContain("Alices");
  });

  it("opens as a spreadsheet with a sheet per table", async () => {
    const data = await withUser(alice, (tx) => exportAccount(tx, alice), appDb());
    const names = ["programs", ...Object.keys(PROGRAM_TABLES)] as TableName[];
    const sheets = Object.fromEntries(names.map((n) => [n, `Ark ${n}`])) as Record<
      TableName,
      string
    >;
    const files = unzip(exportWorkbook(data, { sheets, yes: "ja", no: "nej" }));
    const workbook = files.get("xl/workbook.xml")!;
    for (const n of names) expect(workbook).toContain(`name="Ark ${n}"`);
    const all = [...files.values()].join("");
    expect(all).toContain("Login &amp; &lt;adgang&gt;");
  });
});
