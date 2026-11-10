import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { createItem, deleteItem, listItems, splitFeature, updateItem } from "@/services/items";
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
 * A programme belongs to the user who made it. For anyone else it does
 * not exist: they cannot list it, read it or change anything in it — not
 * its settings, sizes, milestones or items — even with the right ids.
 */

let db: Db;
let alice: string;
let bob: string;
let programId: string;
let milestoneId: string;
let itemId: string;

const base = {
  name: "Alices program",
  goal: "",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 2,
  costPerQuarter: null,
  deviationPct: 10,
};

beforeEach(() => {
  db = openDb(":memory:");
  alice = seedUser(db, "alice@example.com");
  bob = seedUser(db, "bob@example.com");
  programId = createProgram(db, alice, base);
  addMilestone(db, alice, programId, "M1");
  milestoneId = getProgram(db, alice, programId)!.milestones[0]!.id;
  itemId = createItem(db, alice, {
    programId,
    kind: "feature",
    title: "Alices feature",
    parentId: null,
    milestoneId: null,
  });
});

describe("another user", () => {
  it("does not see the programme", () => {
    expect(listPrograms(db, bob)).toEqual([]);
    expect(getProgram(db, bob, programId)).toBeNull();
  });

  it("cannot change or delete the programme or its sizes", () => {
    expect(() => updateProgram(db, bob, { ...base, programId, name: "Kapret" })).toThrow(
      "notFound",
    );
    expect(() =>
      setSizePoints(db, bob, { programId, level: "feature", size: "S", points: 1 }),
    ).toThrow("notFound");
    expect(() => deleteProgram(db, bob, programId)).toThrow("notFound");
    expect(getProgram(db, alice, programId)!.program.name).toBe("Alices program");
  });

  it("cannot touch its milestones", () => {
    expect(() => addMilestone(db, bob, programId, "M2")).toThrow("notFound");
    expect(() =>
      updateMilestone(db, bob, { milestoneId, title: "x", description: "", scopeOverride: 1 }),
    ).toThrow("notFound");
    expect(() => moveMilestone(db, bob, milestoneId, "down")).toThrow("notFound");
    expect(() => removeMilestone(db, bob, milestoneId)).toThrow("notFound");
    expect(getProgram(db, alice, programId)!.milestones).toHaveLength(1);
  });

  it("cannot add, change, split or delete its business goals and features", () => {
    expect(() =>
      createItem(db, bob, {
        programId,
        kind: "goal",
        title: "x",
        parentId: null,
        milestoneId: null,
      }),
    ).toThrow("notFound");
    const row = listItems(db, programId)[0]!;
    expect(() =>
      updateItem(db, bob, {
        itemId,
        title: "Kapret",
        description: "",
        track: row.track,
        size: null,
        pointsOverride: null,
        integration: false,
        status: "planned",
        doneQuarter: null,
        doneNote: "",
        parentId: null,
        milestoneId: null,
        periodIndex: null,
        periodSpan: 1,
      }),
    ).toThrow("notFound");
    expect(() =>
      splitFeature(db, bob, {
        itemId,
        deliveredPoints: 1,
        doneNote: "",
        doneQuarter: 0,
        newTitle: "x",
        newParentId: null,
        newSize: null,
        newPointsOverride: null,
        newPeriodIndex: null,
        newPeriodSpan: 1,
      }),
    ).toThrow("notFound");
    expect(() => deleteItem(db, bob, itemId)).toThrow("notFound");
    expect(listItems(db, programId).map((i) => i.title)).toEqual(["Alices feature"]);
  });

  it("cannot link its own work to the programme's milestone", () => {
    const bobs = createProgram(db, bob, { ...base, name: "Bobs program" });
    expect(() =>
      createItem(db, bob, {
        programId: bobs,
        kind: "goal",
        title: "x",
        parentId: null,
        milestoneId,
      }),
    ).toThrow("notFound");
  });
});
