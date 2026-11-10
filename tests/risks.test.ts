import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { byScore, riskBand } from "@/domain/risk";
import { createProgram } from "@/services/programs";
import { addRisk, deleteRisk, listRisks, updateRisk } from "@/services/risks";
import { seedUser } from "./helpers";

/** The risk log: numbered risks, scored 1-10 on two axes, kept to their owner. */

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

const fields = (riskId: string) => ({
  riskId,
  title: "Migrering er mere kompleks end forventet",
  consequence: "Opgaven tager længere tid",
  mitigation: "Migrér løbende",
  changeNote: "",
  probability: 7,
  impact: 8,
  status: "open" as const,
});

describe("the risk log", () => {
  it("numbers risks in order and keeps the numbers when one is removed", () => {
    addRisk(db, owner, { programId, title: "A" });
    addRisk(db, owner, { programId, title: "B" });
    deleteRisk(db, owner, listRisks(db, programId)[0]!.id);
    addRisk(db, owner, { programId, title: "C" });
    expect(listRisks(db, programId).map((r) => [r.number, r.title])).toEqual([
      [2, "B"],
      [3, "C"],
    ]);
  });

  it("stores the assessment", () => {
    addRisk(db, owner, { programId, title: "A" });
    const id = listRisks(db, programId)[0]!.id;
    updateRisk(db, owner, fields(id));
    expect(listRisks(db, programId)[0]).toMatchObject({
      probability: 7,
      impact: 8,
      mitigation: "Migrér løbende",
    });
  });

  it("refuses another user", () => {
    addRisk(db, owner, { programId, title: "A" });
    const id = listRisks(db, programId)[0]!.id;
    const other = seedUser(db, "other@example.com");
    expect(() => addRisk(db, other, { programId, title: "x" })).toThrow("notFound");
    expect(() => updateRisk(db, other, fields(id))).toThrow("notFound");
    expect(() => deleteRisk(db, other, id)).toThrow("notFound");
  });
});

describe("scoring", () => {
  it("bands by the product of probability and consequence, the most serious first", () => {
    expect([riskBand(4, 5), riskBand(5, 5), riskBand(8, 7)]).toEqual(["low", "medium", "high"]);
    const sorted = byScore([
      { number: 1, probability: 2, impact: 2 },
      { number: 2, probability: 9, impact: 9 },
      { number: 3, probability: 6, impact: 6 },
    ]);
    expect(sorted.map((r) => r.number)).toEqual([2, 3, 1]);
  });
});
