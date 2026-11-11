import { beforeEach, describe, expect, it } from "vitest";
import { createItem, listItems, rankGoals } from "@/services/items";
import { addMilestone, createProgram, getProgram } from "@/services/programs";
import { freshDb } from "./db";
import { seedUser } from "./helpers";
import type { Db } from "@/db/client";

/**
 * Business goals are put in order of priority within their milestone. The
 * order sticks, new goals land at the bottom, and only the milestone's own
 * goals, in the user's own programme, can be reordered.
 */

let db: Db;
let owner: string;
let programId: string;
let milestoneId: string;
let ids: string[];

const settings = {
  name: "Program",
  goal: "",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 4,
  costPerQuarter: null,
  deviationPct: 10,
};
const goal = (title: string, milestone: string | null = milestoneId) =>
  createItem(db, owner, { programId, kind: "goal", title, parentId: null, milestoneId: milestone });
const goalTitles = async () =>
  (await listItems(db, programId)).filter((i) => i.kind === "goal").map((i) => i.title);

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, settings);
  await addMilestone(db, owner, programId, "M1");
  milestoneId = (await getProgram(db, owner, programId))!.milestones[0]!.id;
  ids = [await goal("A"), await goal("B"), await goal("C")];
});

describe("ranking business goals", () => {
  it("keeps the order it is given", async () => {
    await rankGoals(db, owner, { programId, milestoneId, goalIds: [ids[2]!, ids[0]!, ids[1]!] });
    expect(await goalTitles()).toEqual(["C", "A", "B"]);
  });

  it("puts a new goal at the bottom of the ranked ones", async () => {
    await rankGoals(db, owner, { programId, milestoneId, goalIds: [ids[1]!, ids[0]!, ids[2]!] });
    await goal("D");
    expect(await goalTitles()).toEqual(["B", "A", "C", "D"]);
  });

  it("refuses a list that is not exactly the milestone's goals", async () => {
    await expect(
      rankGoals(db, owner, { programId, milestoneId, goalIds: [ids[0]!, ids[1]!] }),
    ).rejects.toThrow("notFound");
    const other = await goal("Uden milepæl", null);
    await expect(
      rankGoals(db, owner, { programId, milestoneId, goalIds: [...ids, other] }),
    ).rejects.toThrow("notFound");
    expect(await goalTitles()).toEqual(["A", "B", "C", "Uden milepæl"]);
  });

  it("refuses another user's programme", async () => {
    const stranger = await seedUser(db, "stranger@example.com");
    await expect(
      rankGoals(db, stranger, { programId, milestoneId, goalIds: [...ids].reverse() }),
    ).rejects.toThrow("notFound");
  });
});
