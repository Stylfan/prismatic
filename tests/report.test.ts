import { describe, expect, it } from "vitest";
import { compareEditions, type Comparable } from "@/domain/report";

/** Change control: what changed between the last published edition and now. */

const base: Comparable = {
  items: [
    {
      id: "a",
      kind: "feature",
      title: "Organisation",
      points: 100,
      period: "Efterår 2026",
      status: "planned",
      splitFromId: null,
    },
    {
      id: "b",
      kind: "feature",
      title: "Beskæftigelse",
      points: 60,
      period: "Vinter 2026/27",
      status: "planned",
      splitFromId: null,
    },
    {
      id: "c",
      kind: "feature",
      title: "Uddannelser",
      points: 100,
      period: "1. halvår 2027",
      status: "planned",
      splitFromId: null,
    },
    {
      id: "d",
      kind: "feature",
      title: "Gammel",
      points: 20,
      period: null,
      status: "planned",
      splitFromId: null,
    },
  ],
  risks: [
    { id: "r1", number: 1, title: "Budget", probability: 6, impact: 7, status: "open" },
    { id: "r2", number: 2, title: "Migrering", probability: 7, impact: 8, status: "open" },
  ],
  milestones: [{ id: "m1", code: "M1", title: "Medlemskab", forecast: "Vinter 2027/28" }],
};

describe("change control", () => {
  it("is empty before the first edition", () => {
    expect(compareEditions(null, base)).toEqual({
      items: [],
      risks: [],
      milestones: [],
      starred: [],
      newRisks: [],
    });
  });

  it("names what was added, closed, moved, re-estimated and removed, and stars the changed cards", () => {
    const now: Comparable = {
      items: [
        { ...base.items[0]!, status: "done" },
        { ...base.items[1]!, period: "1. halvår 2027" },
        { ...base.items[2]!, points: 150 },
        {
          id: "e",
          kind: "feature",
          title: "Beskæftigelse v0.2",
          points: 40,
          period: "1. halvår 2027",
          status: "planned",
          splitFromId: "b",
        },
      ],
      risks: [
        { ...base.risks[0]!, probability: 4 },
        { ...base.risks[1]!, status: "closed" },
        { id: "r3", number: 3, title: "Kompetencer", probability: 8, impact: 6, status: "open" },
      ],
      milestones: [{ id: "m1", code: "M1", title: "Medlemskab", forecast: "Forår 2028" }],
    };
    const cc = compareEditions(base, now);
    expect(cc.items).toEqual([
      { kind: "done", id: "a", title: "Organisation" },
      {
        kind: "moved",
        id: "b",
        title: "Beskæftigelse",
        from: "Vinter 2026/27",
        to: "1. halvår 2027",
      },
      { kind: "reestimated", id: "c", title: "Uddannelser", from: 100, to: 150 },
      { kind: "added", id: "e", title: "Beskæftigelse v0.2", split: true },
      { kind: "removed", id: "d", title: "Gammel" },
    ]);
    expect(cc.starred).toEqual(["b", "c", "e"]);
    expect(cc.risks).toEqual([
      { kind: "moved", number: 1, title: "Budget", from: [6, 7], to: [4, 7] },
      { kind: "closed", number: 2, title: "Migrering" },
      { kind: "new", number: 3, title: "Kompetencer" },
    ]);
    expect(cc.newRisks).toEqual([3]);
    expect(cc.milestones).toEqual([
      { code: "M1", title: "Medlemskab", from: "Vinter 2027/28", to: "Forår 2028" },
    ]);
  });
});
