import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { openDb, type Db } from "@/db/client";
import {
  addMilestone,
  createProgram,
  deleteProgram,
  getProgram,
  listPrograms,
  moveMilestone,
  removeMilestone,
  setSizePoints,
  updateMilestone,
  updateProgram,
} from "@/services/programs";

/**
 * The programme services against a real SQLite database in memory, with
 * the app's own migrations applied: creation seeds the default sizes,
 * milestones keep their numbers through moves and removals, and deleting
 * a programme takes what it owns with it.
 */

let db: Db;
let programId: string;

const base = {
  name: "Nyt kernesystem",
  goal: "MR4 Basis kan lukkes",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 2,
  costPerQuarter: 3_575_000,
  deviationPct: 10,
};

beforeEach(() => {
  db = openDb(":memory:");
  programId = createProgram(db, base);
});

const titles = () => getProgram(db, programId)!.milestones.map((m) => [m.seq, m.title]);

describe("a programme", () => {
  it("is created with its settings and the agreed default sizes", () => {
    const full = getProgram(db, programId)!;
    expect(full.program).toMatchObject({ name: "Nyt kernesystem", periodModel: "seasons" });
    expect(full.sizes.feature).toEqual({ XS: 20, S: 40, M: 60, L: 100, XL: 150 });
    expect(full.sizes.goal).toEqual({ XS: 100, S: 150, M: 250, L: 400, XL: 600, XXL: 1000 });
  });

  it("chooses its own points per size, but gives a feature no XXL", () => {
    setSizePoints(db, { programId, level: "feature", size: "S", points: 12 });
    expect(getProgram(db, programId)!.sizes.feature.S).toBe(12);
    expect(() =>
      setSizePoints(db, { programId, level: "feature", size: "XXL", points: 1 }),
    ).toThrow("notFound");
  });

  it("changes its settings", () => {
    updateProgram(db, { ...base, programId, periodModel: "calendar", quarterHorizon: 3 });
    expect(getProgram(db, programId)!.program).toMatchObject({
      periodModel: "calendar",
      quarterHorizon: 3,
    });
  });

  it("is listed with its milestone count", () => {
    addMilestone(db, programId, "Medlemskab");
    expect(listPrograms(db).map((p) => [p.name, p.milestoneCount])).toEqual([
      ["Nyt kernesystem", 1],
    ]);
  });

  it("takes its milestones and sizes with it when deleted", () => {
    addMilestone(db, programId, "Medlemskab");
    deleteProgram(db, programId);
    expect(getProgram(db, programId)).toBeNull();
    expect(db.get(sql`select count(*) as n from milestones`)).toEqual({ n: 0 });
    expect(db.get(sql`select count(*) as n from program_sizes`)).toEqual({ n: 0 });
  });
});

describe("milestones", () => {
  beforeEach(() => {
    addMilestone(db, programId, "Medlemskab");
    addMilestone(db, programId, "Kontingent");
    addMilestone(db, programId, "Studieforsikring");
  });

  it("number themselves in order", () => {
    expect(titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Kontingent"],
      [3, "Studieforsikring"],
    ]);
  });

  it("keep their numbers through a move", () => {
    const third = getProgram(db, programId)!.milestones[2]!;
    moveMilestone(db, third.id, "up");
    expect(titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Studieforsikring"],
      [3, "Kontingent"],
    ]);
    // Moving the first one up changes nothing.
    moveMilestone(db, getProgram(db, programId)!.milestones[0]!.id, "up");
    expect(titles()[0]).toEqual([1, "Medlemskab"]);
  });

  it("close the gap when one is removed", () => {
    removeMilestone(db, getProgram(db, programId)!.milestones[1]!.id);
    expect(titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Studieforsikring"],
    ]);
  });

  it("take a hand-typed scope", () => {
    const first = getProgram(db, programId)!.milestones[0]!;
    updateMilestone(db, {
      milestoneId: first.id,
      title: "Medlemskab",
      description: "",
      scopeOverride: 2542,
    });
    expect(getProgram(db, programId)!.milestones[0]!.scopeOverride).toBe(2542);
  });

  it("refuse an id that does not exist", () => {
    expect(() => removeMilestone(db, "nope")).toThrow("notFound");
    expect(() => addMilestone(db, "nope", "x")).toThrow("notFound");
  });
});
