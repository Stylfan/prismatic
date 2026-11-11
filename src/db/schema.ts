import {
  bigint,
  boolean,
  index,
  jsonb,
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { id, timestamps } from "./columns";
import { users } from "./schema-accounts";

export * from "./schema-accounts";

/**
 * Prismatic's data, in Postgres. A programme is the unit everything else
 * hangs off, and deleting it deletes what it owns. Row-level security
 * keys every programme table on the programme's owner (drizzle/*_rls.sql),
 * so the database itself hides one account's data from another, and an
 * append-only audit log records every change. Dates are ISO strings
 * (yyyy-mm-dd); instants are milliseconds since the epoch.
 */

/** calendar: Q1–Q4 from 1 January. seasons: autumn from 1 September. custom: from `start_date`. */
export const PERIOD_MODELS = ["calendar", "seasons", "custom"] as const;
export type PeriodModel = (typeof PERIOD_MODELS)[number];

/** Card levels that carry a size: a feature, or the business goal it breaks down. */
export const SIZE_LEVELS = ["feature", "goal"] as const;
export type SizeLevel = (typeof SIZE_LEVELS)[number];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const programs = pgTable("programs", {
  id: id(),
  /** Who the programme belongs to; only they can see or change it, and the database enforces it. */
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  goal: text("goal").notNull().default(""),
  periodModel: text("period_model").$type<PeriodModel>().notNull().default("seasons"),
  /** The programme's first day; its first quarter is the one this date falls in (custom: starts on it). */
  startDate: text("start_date").notNull(),
  /** Quarters shown as quarters from the current one before the roadmap switches to half-years. */
  quarterHorizon: integer("quarter_horizon").notNull().default(2),
  /** Whole kroner per quarter, for the price of a forecast; null means not tracked. */
  costPerQuarter: integer("cost_per_quarter"),
  /** Per cent a goal's features may differ from its estimate before the goal is flagged. */
  deviationPct: integer("deviation_pct").notNull().default(10),
  ...timestamps,
});

/** Points per size, per programme and level. A card may still override its own points. */
export const programSizes = pgTable(
  "program_sizes",
  {
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    level: text("level").$type<SizeLevel>().notNull(),
    size: text("size").$type<Size>().notNull(),
    points: integer("points").notNull(),
  },
  (t) => [primaryKey({ columns: [t.programId, t.level, t.size] })],
);

/**
 * A milestone. No date: the forecast gives it one. Milestones are
 * cumulative in `seq` order, so M2's scope is M1's plus its own.
 */
export const milestones = pgTable(
  "milestones",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    /** 1-based position: M1, M2, … */
    seq: integer("seq").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    /** This milestone's own scope in points, typed by hand; null means computed from its goals. */
    scopeOverride: integer("scope_override"),
    doneAt: bigint("done_at", { mode: "number" }),
    /** Where the manager placed it on the roadmap: a quarter index, null for not placed. */
    periodIndex: integer("period_index"),
    /** 1 for a quarter, 2 for a half-year starting at `period_index`. */
    periodSpan: integer("period_span").notNull().default(1),
    /** Its place among the milestones in the same roadmap column, 0 first; null sorts after. */
    boardRank: integer("board_rank"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("milestones_seq_uq").on(t.programId, t.seq),
    index("milestones_program_idx").on(t.programId),
  ],
);

export const ITEM_KINDS = ["goal", "feature"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** technical: platform work that has no value on its own. business: what the organisation asked for. */
export const TRACKS = ["business", "technical"] as const;
export type Track = (typeof TRACKS)[number];

export const ITEM_STATUSES = ["planned", "in_progress", "done"] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];

/**
 * The backlog: business goals ("forretningsmål") and the features that
 * break them down. A feature belongs to a goal, a goal to a milestone; a
 * missing link is a warning, not an error. A feature without a goal may
 * point at a milestone itself.
 */
export const items = pgTable(
  "items",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ItemKind>().notNull(),
    /** The goal a feature breaks down; null for goals and for features not yet linked. */
    parentId: text("parent_id").references((): AnyPgColumn => items.id, {
      onDelete: "set null",
    }),
    milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    /** A business goal's place in its milestone's priority, 0 first; null sorts after the ranked. */
    rank: integer("rank"),
    description: text("description").notNull().default(""),
    track: text("track").$type<Track>().notNull().default("business"),
    size: text("size").$type<Size>(),
    /** Points typed on the card; null means what its size is worth in the programme. */
    pointsOverride: integer("points_override"),
    /** A big integration with another system is part of this work. */
    integration: boolean("integration").notNull().default(false),
    status: text("status").$type<ItemStatus>().notNull().default("planned"),
    /** Quarter index the item was closed in; set when it is done. */
    doneQuarter: integer("done_quarter"),
    /** What was delivered, written when the item is closed or split. */
    doneNote: text("done_note").notNull().default(""),
    /** Quarter index of the period it is planned for; null means not yet planned. */
    periodIndex: integer("period_index"),
    /** 1 for a quarter, 2 for a half-year starting at `period_index`. */
    periodSpan: integer("period_span").notNull().default(1),
    /** Its place among the cards in the same roadmap column, 0 first; null sorts after. */
    boardRank: integer("board_rank"),
    /** The feature this one was split from, when it is the next version of it. */
    splitFromId: text("split_from_id").references((): AnyPgColumn => items.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("items_program_idx").on(t.programId), index("items_parent_idx").on(t.parentId)],
);

export type Item = typeof items.$inferSelect;

/**
 * Something that happens in a quarter and changes what the team can do:
 * onboarding, a workshop, an estimation day, holidays, a strike.
 */
export const programEvents = pgTable(
  "program_events",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    quarterIndex: integer("quarter_index").notNull(),
    title: text("title").notNull(),
    ...timestamps,
  },
  (t) => [index("program_events_program_idx").on(t.programId, t.quarterIndex)],
);

export type ProgramEvent = typeof programEvents.$inferSelect;

/**
 * One quarter of the programme's ledger: the capacity that quarter (as a
 * percentage of the intended team), and hand-typed numbers that replace the
 * computed delivered or planned points. A missing row means 100 % and the
 * computed numbers.
 */
export const quarterRecords = pgTable(
  "quarter_records",
  {
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    quarterIndex: integer("quarter_index").notNull(),
    capacityPct: integer("capacity_pct").notNull().default(100),
    deliveredOverride: integer("delivered_override"),
    plannedOverride: integer("planned_override"),
    comment: text("comment").notNull().default(""),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.programId, t.quarterIndex] })],
);

export type QuarterRecord = typeof quarterRecords.$inferSelect;

export const RISK_STATUSES = ["open", "closed"] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

/**
 * A risk in the programme's log: "there is a risk that …", what happens if
 * it does, what is done about it, and its probability and consequence on a
 * scale of 1 to 10. Risks are numbered in the order they were raised and
 * keep their number when others are closed.
 */
export const risks = pgTable(
  "risks",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    consequence: text("consequence").notNull().default(""),
    mitigation: text("mitigation").notNull().default(""),
    /** What has changed since the last report, in the manager's words. */
    changeNote: text("change_note").notNull().default(""),
    probability: integer("probability").notNull().default(5),
    impact: integer("impact").notNull().default(5),
    status: text("status").$type<RiskStatus>().notNull().default("open"),
    ...timestamps,
  },
  (t) => [uniqueIndex("risks_number_uq").on(t.programId, t.number)],
);

export type Risk = typeof risks.$inferSelect;

const programRef = () =>
  text("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" });

export const GOAL_STATUSES = ["open", "achieved", "partial", "missed"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** A goal for one quarter, with sub-goals under it and stretch goals marked as such. */
export const quarterGoals = pgTable(
  "quarter_goals",
  {
    id: id(),
    programId: programRef(),
    quarterIndex: integer("quarter_index").notNull(),
    parentId: text("parent_id").references((): AnyPgColumn => quarterGoals.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    stretch: boolean("stretch").notNull().default(false),
    status: text("status").$type<GoalStatus>().notNull().default("open"),
    ...timestamps,
  },
  (t) => [index("quarter_goals_program_idx").on(t.programId, t.quarterIndex)],
);

export const CASE_STATUSES = ["open", "decided"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

/** A case the steering group is asked to decide: problem, background, key points, next steps. */
export const decisionCases = pgTable(
  "decision_cases",
  {
    id: id(),
    programId: programRef(),
    title: text("title").notNull(),
    problem: text("problem").notNull().default(""),
    background: text("background").notNull().default(""),
    keyPoints: text("key_points").notNull().default(""),
    nextSteps: text("next_steps").notNull().default(""),
    status: text("status").$type<CaseStatus>().notNull().default("open"),
    ...timestamps,
  },
  (t) => [index("decision_cases_program_idx").on(t.programId)],
);

export const DECISION_EFFECTS = ["simplifying", "complicating", "neutral", "pending"] as const;
export type DecisionEffect = (typeof DECISION_EFFECTS)[number];

/** A decision taken earlier, kept so the reasons for the plan stay visible. */
export const decisions = pgTable(
  "decisions",
  {
    id: id(),
    programId: programRef(),
    title: text("title").notNull(),
    decidedOn: text("decided_on").notNull().default(""),
    forum: text("forum").notNull().default(""),
    decision: text("decision").notNull().default(""),
    effect: text("effect").$type<DecisionEffect>().notNull().default("pending"),
    ...timestamps,
  },
  (t) => [index("decisions_program_idx").on(t.programId)],
);

/**
 * The words of one quarter's report: the short update since last time and
 * the explanation of the changes. A row without a quarter is a draft from
 * before reports belonged to a quarter; the first quarter saved takes it.
 */
export const reportDrafts = pgTable(
  "report_drafts",
  {
    programId: programRef(),
    quarterIndex: integer("quarter_index"),
    statusText: text("status_text").notNull().default(""),
    changeText: text("change_text").notNull().default(""),
    /** No longer used: the report's quarter is its own. Kept so older rows read. */
    goalsQuarter: integer("goals_quarter"),
    ...timestamps,
  },
  (t) => [uniqueIndex("report_drafts_quarter_uq").on(t.programId, t.quarterIndex)],
);

/** A published report: everything it showed, frozen as JSON, so it reads the same forever. */
export const reportEditions = pgTable(
  "report_editions",
  {
    id: id(),
    programId: programRef(),
    title: text("title").notNull(),
    publishedAt: bigint("published_at", { mode: "number" }).notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("report_editions_program_idx").on(t.programId, t.publishedAt)],
);

export type QuarterGoal = typeof quarterGoals.$inferSelect;
export type DecisionCase = typeof decisionCases.$inferSelect;
export type Decision = typeof decisions.$inferSelect;
export type ReportDraft = typeof reportDrafts.$inferSelect;
export type ReportEdition = typeof reportEditions.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;

/**
 * Every change to a programme's data, written by a database trigger
 * (drizzle/*_audit.sql), never by the application. The application role
 * may only read the rows of its own programmes; nobody may update or
 * delete a row, except the account-deletion function erasing an account
 * completely.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    at: bigint("at", { mode: "number" }).notNull(),
    actorUserId: text("actor_user_id"),
    tableName: text("table_name").notNull(),
    operation: text("operation").notNull(),
    rowId: text("row_id"),
    programId: text("program_id"),
    before: jsonb("before"),
    after: jsonb("after"),
  },
  (t) => [index("audit_log_program_idx").on(t.programId, t.at)],
);

export type AuditEntry = typeof auditLog.$inferSelect;
