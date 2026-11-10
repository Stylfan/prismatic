import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/**
 * Prismatic's data. One SQLite file holds every programme; a programme is
 * the unit everything else hangs off, and deleting it deletes what it owns.
 * Dates are ISO strings (yyyy-mm-dd); instants are milliseconds since the
 * epoch, so they sort and compare without parsing.
 */

/** calendar: Q1–Q4 from 1 January. seasons: autumn from 1 September. custom: from `start_date`. */
export const PERIOD_MODELS = ["calendar", "seasons", "custom"] as const;
export type PeriodModel = (typeof PERIOD_MODELS)[number];

/** Card levels that carry a size: a feature, or the business goal it breaks down. */
export const SIZE_LEVELS = ["feature", "goal"] as const;
export type SizeLevel = (typeof SIZE_LEVELS)[number];

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const now = () => Date.now();

const timestamps = {
  createdAt: integer("created_at").notNull().$defaultFn(now),
  updatedAt: integer("updated_at").notNull().$defaultFn(now).$onUpdateFn(now),
};

export const programs = sqliteTable("programs", {
  id: id(),
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
export const programSizes = sqliteTable(
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
export const milestones = sqliteTable(
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
    doneAt: integer("done_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("milestones_seq_uq").on(t.programId, t.seq),
    index("milestones_program_idx").on(t.programId),
  ],
);

export type Program = typeof programs.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
