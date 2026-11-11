import { beforeEach, describe, expect, it } from "vitest";
import { arrangeBoard } from "@/services/board";
import { createItem, listItems } from "@/services/items";
import { addMilestone, createProgram, getProgram } from "@/services/programs";
import { freshDb } from "./db";
import { seedUser } from "./helpers";
import type { Db } from "@/db/client";

/**
 * Dropping a card or a milestone on the roadmap: the one moved takes the
 * column's period, the column keeps the order it was given, and nothing
 * outside the user's own programme can be moved or ranked.
 */

let db: Db;
let owner: string;
let programId: string;

const settings = {
  name: "Program",
  goal: "",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 4,
  costPerQuarter: null,
  deviationPct: 10,
};
const feature = (title: string) =>
  createItem(db, owner, { programId, kind: "feature", title, parentId: null, milestoneId: null });
const items = async () => new Map((await listItems(db, programId)).map((i) => [i.title, i]));
const arrange = (
  kind: "item" | "milestone",
  movedId: string,
  ids: string[],
  periodIndex: number | null,
  periodSpan: 1 | 2 = 1,
) => arrangeBoard(db, owner, { programId, kind, movedId, ids, periodIndex, periodSpan });

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, settings);
});

describe("arranging the roadmap", () => {
  it("moves the dropped card to the column and keeps the column's order", async () => {
    const [a, b, c] = [await feature("A"), await feature("B"), await feature("C")];
    await arrange("item", a, [a], 3);
    await arrange("item", b, [b, a], 3);
    await arrange("item", c, [b, c, a], 4, 2);
    const by = await items();
    expect([by.get("A")!.periodIndex, by.get("B")!.periodIndex]).toEqual([3, 3]);
    expect([by.get("C")!.periodIndex, by.get("C")!.periodSpan]).toEqual([4, 2]);
    expect(["B", "C", "A"].map((t) => by.get(t)!.boardRank)).toEqual([0, 1, 2]);
  });

  it("places, orders and unplaces milestones", async () => {
    await addMilestone(db, owner, programId, "M1");
    await addMilestone(db, owner, programId, "M2");
    const [m1, m2] = (await getProgram(db, owner, programId))!.milestones.map((m) => m.id) as [
      string,
      string,
    ];
    await arrange("milestone", m1, [m1], 2);
    await arrange("milestone", m2, [m2, m1], 2);
    let ms = (await getProgram(db, owner, programId))!.milestones;
    expect(ms.map((m) => [m.periodIndex, m.boardRank])).toEqual([
      [2, 1],
      [2, 0],
    ]);
    await arrange("milestone", m1, [m1], null);
    ms = (await getProgram(db, owner, programId))!.milestones;
    expect(ms[0]!.periodIndex).toBeNull();
  });

  it("refuses ids it does not know, a moved one outside the list and another user", async () => {
    const a = await feature("A");
    const otherProgram = await createProgram(db, owner, { ...settings, name: "Andet" });
    const foreign = await createItem(db, owner, {
      programId: otherProgram,
      kind: "feature",
      title: "Fremmed",
      parentId: null,
      milestoneId: null,
    });
    await expect(arrange("item", a, [a, foreign], 3)).rejects.toThrow("notFound");
    await expect(arrange("item", foreign, [a], 3)).rejects.toThrow("notFound");
    await expect(arrange("milestone", a, [a], 3)).rejects.toThrow("notFound");
    const stranger = await seedUser(db, "stranger@example.com");
    await expect(
      arrangeBoard(db, stranger, {
        programId,
        kind: "item",
        movedId: a,
        ids: [a],
        periodIndex: 3,
        periodSpan: 1,
      }),
    ).rejects.toThrow("notFound");
    expect((await items()).get("A")!.periodIndex).toBeNull();
  });
});
