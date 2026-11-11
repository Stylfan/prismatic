import { describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import * as backlog from "@/demo/backlog";
import { createDemoProgram, DEMO_NAME } from "@/demo/create";
import * as report from "@/demo/report";
import { milestoneComputedScope, milestoneDone, warningsFor } from "@/domain/backlog";
import { deliveredByQuarter } from "@/domain/ledger";
import { forecast } from "@/domain/forecast";
import { quarterIndexOf, roadmapColumns } from "@/domain/periods";
import { locate } from "@/domain/board";
import { listItems } from "@/services/items";
import { getProgram, listPrograms } from "@/services/programs";
import { listQuarterRecords } from "@/services/quarters";
import { listRisks } from "@/services/risks";
import { appDb, freshDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The example programme: it builds for anyone on any day, its numbers are
 * the ones the real programme's spreadsheet had, nothing in it is flagged
 * as broken, and nothing in it points back to where it came from.
 */

async function demoFor(today: string) {
  const db = await freshDb();
  const user = await seedUser(db, "demo@example.com");
  const programId = await withUser(user, (tx) => createDemoProgram(tx, user, today), appDb());
  return withUser(
    user,
    async (tx) => ({
      user,
      programId,
      full: (await getProgram(tx, user, programId))!,
      items: await listItems(tx, programId),
      records: await listQuarterRecords(tx, programId),
      risks: await listRisks(tx, programId),
      programs: await listPrograms(tx, user),
    }),
    appDb(),
  );
}

describe("the example programme", () => {
  it("is created for the user with its milestones, backlog and risks", async () => {
    const d = await demoFor("2026-11-11");
    expect(d.programs.map((p) => p.name)).toEqual([DEMO_NAME]);
    expect(d.full.milestones).toHaveLength(backlog.DEMO_MILESTONES.length);
    expect(d.items).toHaveLength(backlog.DEMO_ITEMS.length);
    expect(d.risks).toHaveLength(report.DEMO_RISKS.length);
  });

  it("ends its history last quarter, whatever the day", async () => {
    for (const today of ["2026-11-11", "2027-01-20", "2027-04-02", "2027-07-31"]) {
      const d = await demoFor(today);
      const settings = { model: d.full.program.periodModel, startDate: d.full.program.startDate };
      expect(quarterIndexOf(settings, today), today).toBe(4);
      // Every open card sits in one of the roadmap's columns, none of them overdue.
      const columns = roadmapColumns(settings, today, 4);
      for (const item of d.items.filter((i) => i.status !== "done" && i.periodIndex !== null)) {
        expect(locate(columns, item).overdue, `${today}: ${item.title}`).toBe(false);
      }
    }
  });

  it("reproduces the spreadsheet's delivery and tempo from its closed work", async () => {
    const d = await demoFor("2026-11-11");
    const delivered = deliveredByQuarter(d.full.sizes, d.items);
    expect([0, 1, 2, 3].map((q) => delivered.get(q))).toEqual([180, 97, 236, 118]);
    const past = [0, 1, 2, 3].map((q) => ({
      index: q,
      delivered: delivered.get(q)!,
      capacity: d.records.find((r) => r.quarterIndex === q)!.capacityPct / 100,
    }));
    const result = forecast({ past, currentIndex: 4, futureCapacity: () => 1, thresholds: [] });
    expect(result.delivered).toBe(631);
    // The spreadsheet: average of the last five 381.13, the three lowest 333.36, the three highest 427.34.
    expect(result.stats!.avg).toBeCloseTo(381.13, 1);
    expect(result.stats!.low).toBeCloseTo(333.36, 1);
    expect(result.stats!.high).toBeCloseTo(427.34, 1);
  });

  it("takes each milestone's scope from its own goals, and only M1 has work done", async () => {
    const d = await demoFor("2026-11-11");
    const byTitle = new Map(d.full.milestones.map((m) => [m.title, m.id]));
    for (const m of backlog.DEMO_MILESTONES) {
      const id = byTitle.get(m.title)!;
      expect(milestoneComputedScope(d.full.sizes, id, d.items), m.title).toBe(m.scope);
      expect(d.full.milestones.find((x) => x.id === id)!.scopeOverride).toBeNull();
    }
    expect(milestoneDone(d.full.sizes, byTitle.get("Kundeforhold")!, d.items)).toBe(631);
    expect(milestoneDone(d.full.sizes, byTitle.get("Fakturering")!, d.items)).toBe(0);
  });

  it("has no warnings in its backlog", async () => {
    const d = await demoFor("2026-11-11");
    const flagged = d.items
      .map((i) => ({ title: i.title, w: warningsFor(d.full.sizes, i, d.items, 10) }))
      .filter((x) => x.w.length > 0);
    expect(flagged).toEqual([]);
  });

  it("names no organisation, person, supplier or system it came from", () => {
    const text = JSON.stringify({ ...backlog, ...report }).toLowerCase();
    for (const word of [
      "djøf",
      "fagforening",
      "medlem",
      "kontingent",
      "delforening",
      "mr4",
      "cbrain",
      "unison",
      "harmony",
      "blazor",
      "twoday",
      "emagine",
      "f2",
      "pushfar",
      "concierge",
      "planorama",
      "tillidsrepræsentant",
      "cpr",
      "cvr",
    ]) {
      expect(text, word).not.toContain(word);
    }
  });
});
