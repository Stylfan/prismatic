import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
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

/** A person who signs in. Passwords are stored only as a scrypt hash (src/auth/password.ts). */
export const users = sqliteTable(
  "users",
  {
    id: id(),
    /** Stored lower-cased and trimmed, so one address is one account. */
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

/**
 * A signed-in browser. The id is the SHA-256 of the token in the cookie,
 * so a copy of the database does not hand out working sessions.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull().$defaultFn(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;

export const programs = sqliteTable("programs", {
  id: id(),
  /** Who the programme belongs to; only they can see or change it. Null only before the first sign-up. */
  ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
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
export const items = sqliteTable(
  "items",
  {
    id: id(),
    programId: text("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ItemKind>().notNull(),
    /** The goal a feature breaks down; null for goals and for features not yet linked. */
    parentId: text("parent_id").references((): AnySQLiteColumn => items.id, {
      onDelete: "set null",
    }),
    milestoneId: text("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    track: text("track").$type<Track>().notNull().default("business"),
    size: text("size").$type<Size>(),
    /** Points typed on the card; null means what its size is worth in the programme. */
    pointsOverride: integer("points_override"),
    /** A big integration with another system is part of this work. */
    integration: integer("integration", { mode: "boolean" }).notNull().default(false),
    status: text("status").$type<ItemStatus>().notNull().default("planned"),
    /** Quarter index the item was closed in; set when it is done. */
    doneQuarter: integer("done_quarter"),
    /** What was delivered, written when the item is closed or split. */
    doneNote: text("done_note").notNull().default(""),
    /** Quarter index of the period it is planned for; null means not yet planned. */
    periodIndex: integer("period_index"),
    /** 1 for a quarter, 2 for a half-year starting at `period_index`. */
    periodSpan: integer("period_span").notNull().default(1),
    /** The feature this one was split from, when it is the next version of it. */
    splitFromId: text("split_from_id").references((): AnySQLiteColumn => items.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [index("items_program_idx").on(t.programId), index("items_parent_idx").on(t.parentId)],
);

export type Item = typeof items.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
