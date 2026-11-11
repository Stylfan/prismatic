import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { freshDb } from "./db";
import { createProgram } from "@/services/programs";
import { listQuarterRecords, saveQuarter } from "@/services/quarters";
import { seedUser } from "./helpers";

/** The quarter ledger keeps what differs from the defaults and forgets a reset quarter. */

let db: Db;
let owner: string;
let programId: string;

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, {
    name: "P",
    goal: "",
    periodModel: "seasons",
    startDate: "2025-09-01",
    quarterHorizon: 2,
    costPerQuarter: null,
    deviationPct: 10,
  });
});

const base = { capacityPct: 100, deliveredOverride: null, plannedOverride: null, comment: "" };

describe("the quarter ledger", () => {
  it("stores capacity and typed numbers per quarter, and updates in place", async () => {
    await saveQuarter(db, owner, {
      ...base,
      programId,
      quarterIndex: 0,
      capacityPct: 45,
      deliveredOverride: 180,
    });
    await saveQuarter(db, owner, { ...base, programId, quarterIndex: 1, capacityPct: 40 });
    await saveQuarter(db, owner, {
      ...base,
      programId,
      quarterIndex: 0,
      capacityPct: 45,
      deliveredOverride: 178,
    });
    expect(
      (await listQuarterRecords(db, programId)).map((r) => [
        r.quarterIndex,
        r.capacityPct,
        r.deliveredOverride,
      ]),
    ).toEqual([
      [0, 45, 178],
      [1, 40, null],
    ]);
  });

  it("forgets a quarter that is reset to the defaults, and leaves the others", async () => {
    await saveQuarter(db, owner, { ...base, programId, quarterIndex: 0, capacityPct: 45 });
    await saveQuarter(db, owner, { ...base, programId, quarterIndex: 1, capacityPct: 40 });
    await saveQuarter(db, owner, { ...base, programId, quarterIndex: 0 });
    expect((await listQuarterRecords(db, programId)).map((r) => r.quarterIndex)).toEqual([1]);
  });

  it("refuses another user", async () => {
    const other = await seedUser(db, "other@example.com");
    await expect(saveQuarter(db, other, { ...base, programId, quarterIndex: 0 })).rejects.toThrow(
      "notFound",
    );
  });
});
