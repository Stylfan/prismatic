import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { freshDb } from "./db";
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

beforeEach(async () => {
  db = await freshDb();
  alice = await seedUser(db, "alice@example.com");
  bob = await seedUser(db, "bob@example.com");
  programId = await createProgram(db, alice, base);
  await addMilestone(db, alice, programId, "M1");
  milestoneId = (await getProgram(db, alice, programId))!.milestones[0]!.id;
  itemId = await createItem(db, alice, {
    programId,
    kind: "feature",
    title: "Alices feature",
    parentId: null,
    milestoneId: null,
  });
});

describe("another user", () => {
  it("does not see the programme", async () => {
    expect(await listPrograms(db, bob)).toEqual([]);
    expect(await getProgram(db, bob, programId)).toBeNull();
  });

  it("cannot change or delete the programme or its sizes", async () => {
    await expect(updateProgram(db, bob, { ...base, programId, name: "Kapret" })).rejects.toThrow(
      "notFound",
    );
    await expect(
      setSizePoints(db, bob, { programId, level: "feature", size: "S", points: 1 }),
    ).rejects.toThrow("notFound");
    await expect(deleteProgram(db, bob, programId)).rejects.toThrow("notFound");
    expect((await getProgram(db, alice, programId))!.program.name).toBe("Alices program");
  });

  it("cannot touch its milestones", async () => {
    await expect(addMilestone(db, bob, programId, "M2")).rejects.toThrow("notFound");
    await expect(
      updateMilestone(db, bob, { milestoneId, title: "x", description: "", scopeOverride: 1 }),
    ).rejects.toThrow("notFound");
    await expect(moveMilestone(db, bob, milestoneId, "down")).rejects.toThrow("notFound");
    await expect(removeMilestone(db, bob, milestoneId)).rejects.toThrow("notFound");
    expect((await getProgram(db, alice, programId))!.milestones).toHaveLength(1);
  });

  it("cannot add, change, split or delete its business goals and features", async () => {
    await expect(
      createItem(db, bob, {
        programId,
        kind: "goal",
        title: "x",
        parentId: null,
        milestoneId: null,
      }),
    ).rejects.toThrow("notFound");
    const row = (await listItems(db, programId))[0]!;
    await expect(
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
    ).rejects.toThrow("notFound");
    await expect(
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
    ).rejects.toThrow("notFound");
    await expect(deleteItem(db, bob, itemId)).rejects.toThrow("notFound");
    expect((await listItems(db, programId)).map((i) => i.title)).toEqual(["Alices feature"]);
  });

  it("cannot link its own work to the programme's milestone", async () => {
    const bobs = await createProgram(db, bob, { ...base, name: "Bobs program" });
    await expect(
      createItem(db, bob, {
        programId: bobs,
        kind: "goal",
        title: "x",
        parentId: null,
        milestoneId,
      }),
    ).rejects.toThrow("notFound");
  });
});

describe("the roadmap of another user's programme", () => {
  it("cannot be rearranged or given events", async () => {
    const { moveItem: move } = await import("@/services/items");
    const { placeMilestone } = await import("@/services/programs");
    const { addEvent, listEvents, removeEvent } = await import("@/services/events");
    await expect(move(db, bob, { itemId, periodIndex: 5, periodSpan: 1 })).rejects.toThrow(
      "notFound",
    );
    await expect(
      placeMilestone(db, bob, { milestoneId, periodIndex: 5, periodSpan: 1 }),
    ).rejects.toThrow("notFound");
    await expect(
      addEvent(db, bob, { programId, quarterIndex: 5, title: "Strejke" }),
    ).rejects.toThrow("notFound");
    await addEvent(db, alice, { programId, quarterIndex: 5, title: "Onboarding" });
    const eventId = (await listEvents(db, programId))[0]!.id;
    await expect(removeEvent(db, bob, eventId)).rejects.toThrow("notFound");
    expect(await listEvents(db, programId)).toHaveLength(1);
  });
});
