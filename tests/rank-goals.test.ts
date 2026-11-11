import { beforeEach, describe, expect, it } from "vitest";
import { arrangeItems, createItem, listItems } from "@/services/items";
import { addMilestone, createProgram, getProgram } from "@/services/programs";
import { freshDb } from "./db";
import { seedUser } from "./helpers";
import type { Db } from "@/db/client";

/**
 * Goals are put in order within their milestone and features within their
 * goal. Dropping one in another place moves it there: a goal to another
 * milestone, a feature to another goal. The order sticks, new items land
 * at the bottom, and only the user's own items can be moved.
 */

let db: Db;
let owner: string;
let programId: string;
let m1: string;
let m2: string;
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
const goal = (title: string, milestone: string | null = m1) =>
  createItem(db, owner, { programId, kind: "goal", title, parentId: null, milestoneId: milestone });
const feature = (title: string, parentId: string | null) =>
  createItem(db, owner, { programId, kind: "feature", title, parentId, milestoneId: null });
const titles = async (kind: "goal" | "feature", where: (i: Item) => boolean = () => true) =>
  (await listItems(db, programId)).filter((i) => i.kind === kind && where(i)).map((i) => i.title);
type Item = Awaited<ReturnType<typeof listItems>>[number];
const goals = (milestoneId: string | null, list: string[]) =>
  arrangeItems(db, owner, { programId, kind: "goal", milestoneId, ids: list });
const features = (parentId: string | null, list: string[]) =>
  arrangeItems(db, owner, { programId, kind: "feature", parentId, ids: list });

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, settings);
  await addMilestone(db, owner, programId, "M1");
  await addMilestone(db, owner, programId, "M2");
  [m1, m2] = (await getProgram(db, owner, programId))!.milestones.map((m) => m.id) as [
    string,
    string,
  ];
  ids = [await goal("A"), await goal("B"), await goal("C")];
});

describe("ranking business goals", () => {
  it("keeps the order it is given", async () => {
    await goals(m1, [ids[2]!, ids[0]!, ids[1]!]);
    expect(await titles("goal")).toEqual(["C", "A", "B"]);
  });

  it("puts a new goal at the bottom of the ranked ones", async () => {
    await goals(m1, [ids[1]!, ids[0]!, ids[2]!]);
    await goal("D");
    expect(await titles("goal")).toEqual(["B", "A", "C", "D"]);
  });

  it("moves a goal dropped under another milestone to that milestone", async () => {
    const d = await goal("D", m2);
    await goals(m2, [ids[1]!, d]);
    expect(await titles("goal", (i) => i.milestoneId === m2)).toEqual(["B", "D"]);
    expect(await titles("goal", (i) => i.milestoneId === m1)).toEqual(["A", "C"]);
  });

  it("refuses a list that leaves out a goal already there", async () => {
    await expect(goals(m1, [ids[0]!, ids[1]!])).rejects.toThrow("notFound");
    await expect(goals(m1, [ids[0]!, ids[0]!, ids[1]!, ids[2]!])).rejects.toThrow("notFound");
    expect(await titles("goal")).toEqual(["A", "B", "C"]);
  });

  it("refuses another user's programme", async () => {
    const stranger = await seedUser(db, "stranger@example.com");
    await expect(
      arrangeItems(db, stranger, { programId, kind: "goal", milestoneId: m1, ids: [...ids] }),
    ).rejects.toThrow("notFound");
  });
});

describe("arranging features", () => {
  it("orders a goal's features and moves one dropped under another goal", async () => {
    const [a, b] = ids as [string, string];
    const f1 = await feature("F1", a);
    const f2 = await feature("F2", a);
    const f3 = await feature("F3", b);
    await features(a, [f2, f1]);
    expect(await titles("feature", (i) => i.parentId === a)).toEqual(["F2", "F1"]);
    await features(b, [f1, f3]);
    expect(await titles("feature", (i) => i.parentId === b)).toEqual(["F1", "F3"]);
    expect(await titles("feature", (i) => i.parentId === a)).toEqual(["F2"]);
  });

  it("moves a feature out of its goal and back under one", async () => {
    const f = await feature("F", ids[0]!);
    await features(null, [f]);
    expect(await titles("feature", (i) => i.parentId === null)).toEqual(["F"]);
    await features(ids[1]!, [f]);
    const moved = (await listItems(db, programId)).find((i) => i.id === f)!;
    expect([moved.parentId, moved.milestoneId]).toEqual([ids[1], null]);
  });

  it("refuses to put a goal under a goal or a feature under a milestone", async () => {
    const f = await feature("F", ids[0]!);
    await expect(features(ids[1]!, [ids[2]!])).rejects.toThrow("notFound");
    await expect(goals(m2, [f])).rejects.toThrow("notFound");
    await expect(features(f, [])).rejects.toThrow();
  });
});
