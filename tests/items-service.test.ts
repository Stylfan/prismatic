import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { freshDb } from "./db";
import { createItem, deleteItem, listItems, splitFeature, updateItem } from "@/services/items";
import { addMilestone, createProgram, getProgram } from "@/services/programs";
import { seedUser } from "./helpers";

/**
 * Business goals and features against a real in-memory database: links
 * stay inside the programme, a feature under a goal leaves the milestone
 * to its goal, deleting a goal keeps its features, and a split closes the
 * original with what was delivered and carries the rest on.
 */

let db: Db;
let programId: string;
let milestoneId: string;
let owner: string;

const base = {
  name: "Program",
  goal: "",
  periodModel: "seasons" as const,
  startDate: "2025-09-01",
  quarterHorizon: 2,
  costPerQuarter: null,
  deviationPct: 10,
};

const edit = async (itemId: string) => {
  const row = (await listItems(db, programId)).find((i) => i.id === itemId)!;
  return {
    itemId,
    title: row.title,
    description: row.description,
    track: row.track,
    size: row.size,
    pointsOverride: row.pointsOverride,
    integration: row.integration,
    status: row.status,
    doneQuarter: row.doneQuarter,
    doneNote: row.doneNote,
    parentId: row.parentId,
    milestoneId: row.milestoneId,
    periodIndex: row.periodIndex,
    periodSpan: row.periodSpan as 1 | 2,
  };
};

beforeEach(async () => {
  db = await freshDb();
  owner = await seedUser(db, "owner@example.com");
  programId = await createProgram(db, owner, base);
  await addMilestone(db, owner, programId, "Medlemskab");
  milestoneId = (await getProgram(db, owner, programId))!.milestones[0]!.id;
});

describe("creating", () => {
  it("links a goal to a milestone and a feature to a goal", async () => {
    const goal = await createItem(db, owner, {
      programId,
      kind: "goal",
      title: "Medlemskab",
      parentId: null,
      milestoneId,
    });
    const feature = await createItem(db, owner, {
      programId,
      kind: "feature",
      title: "Beskæftigelse",
      parentId: goal,
      milestoneId,
    });
    const rows = await listItems(db, programId);
    expect(rows.find((r) => r.id === goal)).toMatchObject({ milestoneId, parentId: null });
    // The feature counts through its goal, so its own milestone is cleared.
    expect(rows.find((r) => r.id === feature)).toMatchObject({ parentId: goal, milestoneId: null });
  });

  it("refuses a goal or milestone from another programme", async () => {
    const other = await createProgram(db, owner, { ...base, name: "Andet" });
    const foreignGoal = await createItem(db, owner, {
      programId: other,
      kind: "goal",
      title: "Fremmed",
      parentId: null,
      milestoneId: null,
    });
    await expect(
      createItem(db, owner, {
        programId,
        kind: "feature",
        title: "x",
        parentId: foreignGoal,
        milestoneId: null,
      }),
    ).rejects.toThrow("notFound");
    await expect(
      createItem(db, owner, {
        programId: other,
        kind: "goal",
        title: "x",
        parentId: null,
        milestoneId,
      }),
    ).rejects.toThrow("notFound");
  });
});

describe("editing", () => {
  it("stores the closing quarter only while the item is done, and keeps a feature's size in range", async () => {
    const f = await createItem(db, owner, {
      programId,
      kind: "feature",
      title: "F",
      parentId: null,
      milestoneId: null,
    });
    await updateItem(db, owner, {
      ...(await edit(f)),
      status: "done",
      doneQuarter: 4,
      size: "XXL",
    });
    expect((await listItems(db, programId))[0]).toMatchObject({
      status: "done",
      doneQuarter: 4,
      size: null,
    });
    await updateItem(db, owner, { ...(await edit(f)), status: "in_progress", doneQuarter: 4 });
    expect((await listItems(db, programId))[0]).toMatchObject({
      status: "in_progress",
      doneQuarter: null,
    });
  });
});

describe("deleting a goal", () => {
  it("keeps its features, now without a goal", async () => {
    const goal = await createItem(db, owner, {
      programId,
      kind: "goal",
      title: "G",
      parentId: null,
      milestoneId,
    });
    const f = await createItem(db, owner, {
      programId,
      kind: "feature",
      title: "F",
      parentId: goal,
      milestoneId: null,
    });
    await deleteItem(db, owner, goal);
    expect(await listItems(db, programId)).toEqual([
      expect.objectContaining({ id: f, parentId: null }),
    ]);
  });
});

describe("splitting a feature", () => {
  it("closes the original with what was delivered and carries the rest as a new version", async () => {
    const goal = await createItem(db, owner, {
      programId,
      kind: "goal",
      title: "G",
      parentId: null,
      milestoneId,
    });
    const f = await createItem(db, owner, {
      programId,
      kind: "feature",
      title: "Background Jobs v0",
      parentId: goal,
      milestoneId: null,
    });
    await updateItem(db, owner, { ...(await edit(f)), size: "L", periodIndex: 4 });
    const next = await splitFeature(db, owner, {
      itemId: f,
      deliveredPoints: 60,
      doneNote: "Jobs kører; retry mangler",
      doneQuarter: 4,
      newTitle: "Background Jobs v0.1",
      newParentId: null,
      newSize: "M",
      newPointsOverride: null,
      newPeriodIndex: 5,
      newPeriodSpan: 1,
    });
    const rows = await listItems(db, programId);
    expect(rows.find((r) => r.id === f)).toMatchObject({
      status: "done",
      pointsOverride: 60,
      doneQuarter: 4,
      doneNote: "Jobs kører; retry mangler",
    });
    expect(rows.find((r) => r.id === next)).toMatchObject({
      title: "Background Jobs v0.1",
      parentId: null,
      size: "M",
      status: "planned",
      periodIndex: 5,
      splitFromId: f,
    });
  });
});
