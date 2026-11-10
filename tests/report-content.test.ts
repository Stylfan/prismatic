import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "@/db/client";
import { createProgram } from "@/services/programs";
import {
  addCase,
  addDecision,
  addGoal,
  deleteGoal,
  getDraft,
  getEdition,
  listCases,
  listDecisions,
  listEditions,
  listGoals,
  saveDraft,
  saveEdition,
  updateCase,
  updateDecision,
  updateGoal,
} from "@/services/report-content";
import { seedUser } from "./helpers";

/**
 * The report's own content and its editions: goals nest one level, texts
 * are saved per programme, editions are kept newest first, and none of it
 * can be read or changed by another user.
 */

let db: Db;
let owner: string;
let other: string;
let programId: string;

beforeEach(() => {
  db = openDb(":memory:");
  owner = seedUser(db, "owner@example.com");
  other = seedUser(db, "other@example.com");
  programId = createProgram(db, owner, {
    name: "P",
    goal: "",
    periodModel: "seasons",
    startDate: "2025-09-01",
    quarterHorizon: 2,
    costPerQuarter: null,
    deviationPct: 10,
  });
});

describe("quarter goals", () => {
  it("keep sub-goals under their goal and go with it when it is deleted", () => {
    addGoal(db, owner, {
      programId,
      quarterIndex: 4,
      title: "Mål",
      parentId: null,
      stretch: false,
    });
    const goal = listGoals(db, programId)[0]!;
    addGoal(db, owner, {
      programId,
      quarterIndex: 4,
      title: "Delmål",
      parentId: goal.id,
      stretch: true,
    });
    updateGoal(db, owner, { goalId: goal.id, title: "Mål", stretch: false, status: "partial" });
    expect(
      listGoals(db, programId).map((g) => [g.title, g.status, g.parentId === goal.id]),
    ).toEqual([
      ["Mål", "partial", false],
      ["Delmål", "open", true],
    ]);
    deleteGoal(db, owner, goal.id);
    expect(listGoals(db, programId)).toEqual([]);
  });
});

describe("texts, cases and decisions", () => {
  it("are stored per programme", () => {
    saveDraft(db, owner, {
      programId,
      statusText: "Godt kvartal",
      changeText: "",
      goalsQuarter: 3,
    });
    saveDraft(db, owner, {
      programId,
      statusText: "Rigtig godt kvartal",
      changeText: "",
      goalsQuarter: 3,
    });
    expect(getDraft(db, programId)).toMatchObject({
      statusText: "Rigtig godt kvartal",
      goalsQuarter: 3,
    });
    addCase(db, owner, { programId, title: "Medlemmer under 18 år?" });
    addDecision(db, owner, { programId, title: "CPR-nummer på alle" });
    expect(listCases(db, programId)).toHaveLength(1);
    expect(listDecisions(db, programId)).toHaveLength(1);
  });
});

describe("editions", () => {
  it("are listed newest first and read back as published", () => {
    saveEdition(db, owner, { programId, title: "Marts", data: '{"a":1}', publishedAt: 1 });
    const second = saveEdition(db, owner, {
      programId,
      title: "Juni",
      data: '{"a":2}',
      publishedAt: 2,
    });
    expect(listEditions(db, programId).map((e) => e.title)).toEqual(["Juni", "Marts"]);
    expect(getEdition(db, owner, programId, second).data).toBe('{"a":2}');
  });
});

describe("another user", () => {
  it("cannot read or change any of it", () => {
    addGoal(db, owner, {
      programId,
      quarterIndex: 4,
      title: "Mål",
      parentId: null,
      stretch: false,
    });
    addCase(db, owner, { programId, title: "Sag" });
    addDecision(db, owner, { programId, title: "Beslutning" });
    const edition = saveEdition(db, owner, { programId, title: "Marts", data: "{}" });
    const goal = listGoals(db, programId)[0]!;
    const c = listCases(db, programId)[0]!;
    const d = listDecisions(db, programId)[0]!;
    expect(() =>
      addGoal(db, other, {
        programId,
        quarterIndex: 4,
        title: "x",
        parentId: null,
        stretch: false,
      }),
    ).toThrow("notFound");
    expect(() =>
      updateGoal(db, other, { goalId: goal.id, title: "x", stretch: false, status: "missed" }),
    ).toThrow("notFound");
    expect(() =>
      updateCase(db, other, {
        caseId: c.id,
        title: "x",
        problem: "",
        background: "",
        keyPoints: "",
        nextSteps: "",
        status: "decided",
      }),
    ).toThrow("notFound");
    expect(() =>
      updateDecision(db, other, {
        decisionId: d.id,
        title: "x",
        decidedOn: "",
        forum: "",
        decision: "",
        effect: "neutral",
      }),
    ).toThrow("notFound");
    expect(() =>
      saveDraft(db, other, { programId, statusText: "x", changeText: "", goalsQuarter: null }),
    ).toThrow("notFound");
    expect(() => saveEdition(db, other, { programId, title: "x", data: "{}" })).toThrow("notFound");
    expect(() => getEdition(db, other, programId, edition)).toThrow("notFound");
  });
});
