import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { addEvent, listEvents } from "@/services/events";
import { createItem, listItems, moveItem } from "@/services/items";
import {
  addMilestone,
  createProgram,
  getProgram,
  placeMilestone,
  updateProgram,
} from "@/services/programs";
import { listQuarterRecords, saveQuarter } from "@/services/quarters";
import { seedUser } from "./helpers";

/**
 * Changing a programme's start keeps everything at the same point in time:
 * a card planned for Vinter 2026/27 stays in Vinter 2026/27, whatever
 * number that quarter now has.
 */

let db: Db;
let owner: string;
let programId: string;
const settings = {
  name: "P",
  goal: "",
  periodModel: "seasons" as const,
  quarterHorizon: 2,
  costPerQuarter: null,
  deviationPct: 10,
};

beforeEach(() => {
  db = openDb(":memory:");
  owner = seedUser(db, "owner@example.com");
  // Starts in Efterår 2026, so Vinter 2026/27 is quarter 1.
  programId = createProgram(db, owner, { ...settings, startDate: "2026-11-10" });
});

describe("moving the start back a year", () => {
  it("moves every period number so nothing changes place in time", () => {
    const item = createItem(db, owner, {
      programId,
      kind: "feature",
      title: "F",
      parentId: null,
      milestoneId: null,
    });
    moveItem(db, owner, { itemId: item, periodIndex: 1, periodSpan: 1 });
    addMilestone(db, owner, programId, "M1");
    const m = getProgram(db, owner, programId)!.milestones[0]!;
    placeMilestone(db, owner, { milestoneId: m.id, periodIndex: 2, periodSpan: 2 });
    addEvent(db, owner, { programId, quarterIndex: 1, title: "Onboarding" });
    saveQuarter(db, owner, {
      programId,
      quarterIndex: 0,
      capacityPct: 60,
      deliveredOverride: null,
      plannedOverride: null,
      comment: "",
    });

    // From Efterår 2025, Vinter 2026/27 is quarter 5.
    updateProgram(db, owner, { ...settings, programId, startDate: "2025-09-01" });

    expect(listItems(db, programId)[0]!.periodIndex).toBe(5);
    expect(getProgram(db, owner, programId)!.milestones[0]).toMatchObject({
      periodIndex: 6,
      periodSpan: 2,
    });
    expect(listEvents(db, programId)[0]!.quarterIndex).toBe(5);
    expect(listQuarterRecords(db, programId).map((r) => [r.quarterIndex, r.capacityPct])).toEqual([
      [4, 60],
    ]);
  });

  it("leaves everything alone when only other settings change", () => {
    const item = createItem(db, owner, {
      programId,
      kind: "feature",
      title: "F",
      parentId: null,
      milestoneId: null,
    });
    moveItem(db, owner, { itemId: item, periodIndex: 1, periodSpan: 1 });
    updateProgram(db, owner, { ...settings, programId, startDate: "2026-11-10", name: "Nyt navn" });
    expect(listItems(db, programId)[0]!.periodIndex).toBe(1);
  });
});
