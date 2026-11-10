import type { PeriodModel } from "@/db/schema";

/**
 * A program's periods (docs/adr/0001). A period is addressed by its
 * quarter index from the program's first quarter: 0 is the quarter the
 * start date falls in (for a custom model, the quarter that starts on it).
 * A half-year is two aligned quarters and is addressed by its first.
 *
 * Everything here is date arithmetic on ISO strings in UTC, so a quarter
 * never shifts by a day across daylight saving. Labels come back as
 * structured values; the UI renders them in its own language.
 */

export type PeriodSettings = { model: PeriodModel; startDate: string };

export type Season = "spring" | "summer" | "autumn" | "winter";

export type PeriodLabel =
  | { kind: "quarter"; model: "calendar"; quarter: 1 | 2 | 3 | 4; year: number }
  | { kind: "quarter"; model: "seasons"; season: Season; year: number }
  | { kind: "quarter"; model: "custom"; n: number }
  | { kind: "half"; model: "calendar" | "seasons"; half: 1 | 2; year: number }
  | { kind: "half"; model: "custom"; n: number };

export type Period = {
  /** Quarter index of the period's first quarter. */
  index: number;
  /** 1 for a quarter, 2 for a half-year. */
  span: 1 | 2;
  start: string;
  /** Last day, inclusive. */
  end: string;
  label: PeriodLabel;
};

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y: y!, m: m!, d: d! };
};

const iso = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Adds whole months, holding the day where the month allows it (31 Jan + 1 = 28/29 Feb). */
export function addMonthsIso(date: string, months: number): string {
  const { y, m, d } = parse(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

function previousDay(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`) - 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** The month a quarter may start in: calendar Jan/Apr/Jul/Oct, seasons Mar/Jun/Sep/Dec. */
const offset = (model: PeriodModel) => (model === "seasons" ? 2 : 0);

/** The first day of the program's first quarter. */
export function firstQuarterStart(settings: PeriodSettings): string {
  if (settings.model === "custom") return settings.startDate;
  const { y, m } = parse(settings.startDate);
  const k = offset(settings.model);
  const back = (((m - 1 - k) % 3) + 3) % 3;
  return addMonthsIso(iso(y, m, 1), -back);
}

export function quarterStart(settings: PeriodSettings, index: number): string {
  return addMonthsIso(firstQuarterStart(settings), 3 * index);
}

export function quarterEnd(settings: PeriodSettings, index: number): string {
  return previousDay(quarterStart(settings, index + 1));
}

/** The quarter a date falls in; negative before the program starts. */
export function quarterIndexOf(settings: PeriodSettings, date: string): number {
  const first = firstQuarterStart(settings);
  const a = parse(first);
  const b = parse(date);
  let i = Math.floor((b.y * 12 + b.m - (a.y * 12 + a.m)) / 3);
  // A custom start mid-month: step back while the date is before that quarter's start.
  while (quarterStart(settings, i) > date) i -= 1;
  while (quarterStart(settings, i + 1) <= date) i += 1;
  return i;
}

/** True when a half-year may start at this quarter. */
export function isHalfStart(settings: PeriodSettings, index: number): boolean {
  if (settings.model === "custom") return index % 2 === 0;
  const { m } = parse(quarterStart(settings, index));
  return settings.model === "calendar" ? m === 1 || m === 7 : m === 3 || m === 9;
}

const SEASON_BY_MONTH: Record<number, Season> = {
  3: "spring",
  6: "summer",
  9: "autumn",
  12: "winter",
};

export function quarterLabel(settings: PeriodSettings, index: number): PeriodLabel {
  const { y, m } = parse(quarterStart(settings, index));
  if (settings.model === "custom") return { kind: "quarter", model: "custom", n: index + 1 };
  if (settings.model === "calendar") {
    return { kind: "quarter", model: "calendar", quarter: ((m + 2) / 3) as 1 | 2 | 3 | 4, year: y };
  }
  // Winter runs December to February and carries December's year.
  return { kind: "quarter", model: "seasons", season: SEASON_BY_MONTH[m]!, year: y };
}

export function halfLabel(settings: PeriodSettings, index: number): PeriodLabel {
  const { y, m } = parse(quarterStart(settings, index));
  if (settings.model === "custom") return { kind: "half", model: "custom", n: index / 2 + 1 };
  if (settings.model === "calendar") {
    return { kind: "half", model: "calendar", half: m === 1 ? 1 : 2, year: y };
  }
  // Spring and summer are the first half of the year; autumn and winter the second.
  return { kind: "half", model: "seasons", half: m === 3 ? 1 : 2, year: y };
}

export function quarterPeriod(settings: PeriodSettings, index: number): Period {
  return {
    index,
    span: 1,
    start: quarterStart(settings, index),
    end: quarterEnd(settings, index),
    label: quarterLabel(settings, index),
  };
}

export function halfPeriod(settings: PeriodSettings, index: number): Period {
  return {
    index,
    span: 2,
    start: quarterStart(settings, index),
    end: quarterEnd(settings, index + 1),
    label: halfLabel(settings, index),
  };
}

/**
 * The roadmap's columns: the current quarter and `quarterHorizon - 1`
 * after it as quarters, more quarters until a half-year can start, then
 * `halfYears` half-years. Before the program starts, the first quarter is
 * the current one.
 */
export function roadmapColumns(
  settings: PeriodSettings,
  today: string,
  quarterHorizon: number,
  halfYears = 4,
): Period[] {
  const columns: Period[] = [];
  let i = Math.max(0, quarterIndexOf(settings, today));
  for (let n = 0; n < Math.max(1, quarterHorizon); n += 1)
    columns.push(quarterPeriod(settings, i++));
  while (!isHalfStart(settings, i)) columns.push(quarterPeriod(settings, i++));
  for (let n = 0; n < halfYears; n += 1, i += 2) columns.push(halfPeriod(settings, i));
  return columns;
}
