import { beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { freshDb } from "./db";
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
import { seedUser } from "./helpers";

/**
 * The programme services against the Postgres test database, with
 * the app's own migrations applied: creation seeds the default sizes,
 * milestones keep their numbers through moves and removals, and deleting
 * a programme takes what it owns with it.
 */

let db: Db;
let programId: string;
let owner: string;

const base = {
  name: "Nyt kernesystem",
  goal: "MR4 Basis kan lukkes",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 2,
  costPerQuarter: 3_575_000,
  deviationPct: 10,
};

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, base);
});

const titles = async () =>
  (await getProgram(db, owner, programId))!.milestones.map((m) => [m.seq, m.title]);

describe("a programme", () => {
  it("is created with its settings and the agreed default sizes", async () => {
    const full = (await getProgram(db, owner, programId))!;
    expect(full.program).toMatchObject({ name: "Nyt kernesystem", periodModel: "seasons" });
    expect(full.sizes.feature).toEqual({ XS: 20, S: 40, M: 60, L: 100, XL: 150 });
    expect(full.sizes.goal).toEqual({ XS: 100, S: 150, M: 250, L: 400, XL: 600, XXL: 1000 });
  });

  it("chooses its own points per size, but gives a feature no XXL", async () => {
    await setSizePoints(db, owner, { programId, level: "feature", size: "S", points: 12 });
    expect((await getProgram(db, owner, programId))!.sizes.feature.S).toBe(12);
    await expect(
      setSizePoints(db, owner, { programId, level: "feature", size: "XXL", points: 1 }),
    ).rejects.toThrow("notFound");
  });

  it("changes its settings", async () => {
    await updateProgram(db, owner, {
      ...base,
      programId,
      periodModel: "calendar",
      quarterHorizon: 3,
    });
    expect((await getProgram(db, owner, programId))!.program).toMatchObject({
      periodModel: "calendar",
      quarterHorizon: 3,
    });
  });

  it("is listed with its milestone count", async () => {
    await addMilestone(db, owner, programId, "Medlemskab");
    expect((await listPrograms(db, owner)).map((p) => [p.name, p.milestoneCount])).toEqual([
      ["Nyt kernesystem", 1],
    ]);
  });

  it("takes its milestones and sizes with it when deleted", async () => {
    await addMilestone(db, owner, programId, "Medlemskab");
    await deleteProgram(db, owner, programId);
    expect(await getProgram(db, owner, programId)).toBeNull();
    expect((await db.execute(sql`select count(*)::int as n from milestones`)).rows[0]).toEqual({
      n: 0,
    });
    expect((await db.execute(sql`select count(*)::int as n from program_sizes`)).rows[0]).toEqual({
      n: 0,
    });
  });
});

describe("milestones", () => {
  beforeEach(async () => {
    await addMilestone(db, owner, programId, "Medlemskab");
    await addMilestone(db, owner, programId, "Kontingent");
    await addMilestone(db, owner, programId, "Studieforsikring");
  });

  it("number themselves in order", async () => {
    expect(await titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Kontingent"],
      [3, "Studieforsikring"],
    ]);
  });

  it("keep their numbers through a move", async () => {
    const third = (await getProgram(db, owner, programId))!.milestones[2]!;
    await moveMilestone(db, owner, third.id, "up");
    expect(await titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Studieforsikring"],
      [3, "Kontingent"],
    ]);
    // Moving the first one up changes nothing.
    await moveMilestone(
      db,
      owner,
      (await getProgram(db, owner, programId))!.milestones[0]!.id,
      "up",
    );
    expect((await titles())[0]).toEqual([1, "Medlemskab"]);
  });

  it("close the gap when one is removed", async () => {
    await removeMilestone(db, owner, (await getProgram(db, owner, programId))!.milestones[1]!.id);
    expect(await titles()).toEqual([
      [1, "Medlemskab"],
      [2, "Studieforsikring"],
    ]);
  });

  it("take a hand-typed scope", async () => {
    const first = (await getProgram(db, owner, programId))!.milestones[0]!;
    await updateMilestone(db, owner, {
      milestoneId: first.id,
      title: "Medlemskab",
      description: "",
      scopeOverride: 2542,
    });
    expect((await getProgram(db, owner, programId))!.milestones[0]!.scopeOverride).toBe(2542);
  });

  it("refuse an id that does not exist", async () => {
    await expect(removeMilestone(db, owner, "nope")).rejects.toThrow("notFound");
    await expect(addMilestone(db, owner, "nope", "x")).rejects.toThrow("notFound");
  });
});
