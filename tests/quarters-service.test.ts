import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { createProgram } from "@/services/programs";
import { listQuarterRecords, saveQuarter } from "@/services/quarters";
import { seedUser } from "./helpers";

/** The quarter ledger keeps what differs from the defaults and forgets a reset quarter. */

let db: Db;
let owner: string;
let programId: string;

beforeEach(() => {
  db = openDb(":memory:");
  owner = seedUser(db, "owner@example.com");
  programId = createProgram(db, owner, {
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
  it("stores capacity and typed numbers per quarter, and updates in place", () => {
    saveQuarter(db, owner, {
      ...base,
      programId,
      quarterIndex: 0,
      capacityPct: 45,
      deliveredOverride: 180,
    });
    saveQuarter(db, owner, { ...base, programId, quarterIndex: 1, capacityPct: 40 });
    saveQuarter(db, owner, {
      ...base,
      programId,
      quarterIndex: 0,
      capacityPct: 45,
      deliveredOverride: 178,
    });
    expect(
      listQuarterRecords(db, programId).map((r) => [
        r.quarterIndex,
        r.capacityPct,
        r.deliveredOverride,
      ]),
    ).toEqual([
      [0, 45, 178],
      [1, 40, null],
    ]);
  });

  it("forgets a quarter that is reset to the defaults, and leaves the others", () => {
    saveQuarter(db, owner, { ...base, programId, quarterIndex: 0, capacityPct: 45 });
    saveQuarter(db, owner, { ...base, programId, quarterIndex: 1, capacityPct: 40 });
    saveQuarter(db, owner, { ...base, programId, quarterIndex: 0 });
    expect(listQuarterRecords(db, programId).map((r) => r.quarterIndex)).toEqual([1]);
  });

  it("refuses another user", () => {
    const other = seedUser(db, "other@example.com");
    expect(() => saveQuarter(db, other, { ...base, programId, quarterIndex: 0 })).toThrow(
      "notFound",
    );
  });
});
