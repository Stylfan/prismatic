/**
 * The forecast from delivery (CLAUDE.md, domain rules), the same model as
 * the programme's own "Fremdrift" spreadsheet:
 *
 * - Each quarter that has ended has delivered points and a capacity (the
 *   share of the intended team that was actually there).
 * - Its capacity-adjusted velocity is delivered ÷ capacity: what a full team
 *   would have done.
 * - Over the last five such quarters, three tempi: low is the average of the
 *   three lowest, average is the average of all, high the average of the
 *   three highest. With three or fewer quarters, low and high are simply the
 *   lowest and the highest.
 * - From the current quarter on, each tempo is projected as velocity ×
 *   that quarter's expected capacity, added to what has been delivered.
 * - A milestone is forecast for the first quarter in which a projection
 *   reaches its cumulative scope; its price is the cost of every quarter
 *   from the programme's first up to and including that one.
 */

export const WINDOW = 5;
export const TAIL = 3;

export type Tempo = "low" | "avg" | "high";
export const TEMPI: Tempo[] = ["low", "avg", "high"];

export type Stats = Record<Tempo, number>;

export type PastQuarter = {
  index: number;
  delivered: number;
  /** A fraction: 0.45 for 45 %. */
  capacity: number;
};

export function velocity(q: PastQuarter): number | null {
  return q.capacity > 0 ? q.delivered / q.capacity : null;
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function velocityStats(velocities: number[]): Stats | null {
  const window = velocities.slice(-WINDOW);
  if (window.length === 0) return null;
  const sorted = [...window].sort((a, b) => a - b);
  if (sorted.length <= TAIL) {
    return { low: sorted[0]!, avg: mean(sorted), high: sorted[sorted.length - 1]! };
  }
  return {
    low: mean(sorted.slice(0, TAIL)),
    avg: mean(sorted),
    high: mean(sorted.slice(-TAIL)),
  };
}

export type SeriesPoint = {
  index: number;
  /** Cumulative delivered, for quarters that have ended. */
  actual: number | null;
  /** Cumulative projection per tempo, from the current quarter on. */
  low: number | null;
  avg: number | null;
  high: number | null;
};

export type MilestoneForecast = {
  id: string;
  /** Cumulative scope the delivery has to reach. */
  threshold: number;
  /** Already reached in a quarter that has ended. */
  reachedAt: number | null;
  /** Forecast quarter per tempo, or null when it is not reached within the horizon. */
  at: Record<Tempo, number | null>;
};

export type ForecastResult = {
  stats: Stats | null;
  delivered: number;
  series: SeriesPoint[];
  milestones: MilestoneForecast[];
};

export function forecast(input: {
  past: PastQuarter[];
  currentIndex: number;
  /** Expected capacity for a quarter from the current one on, as a fraction. */
  futureCapacity: (index: number) => number;
  thresholds: Array<{ id: string; points: number }>;
  /** Quarters to project beyond the current one. */
  horizon?: number;
}): ForecastResult {
  const horizon = input.horizon ?? 40;
  const past = [...input.past].sort((a, b) => a.index - b.index);
  const velocities = past.map(velocity).filter((v): v is number => v !== null);
  const stats = velocityStats(velocities);

  const series: SeriesPoint[] = [];
  let cumulative = 0;
  for (const q of past) {
    cumulative += q.delivered;
    series.push({ index: q.index, actual: cumulative, low: null, avg: null, high: null });
  }
  const delivered = cumulative;

  if (stats) {
    // The projections start from the last delivered total.
    const last = series[series.length - 1];
    if (last) Object.assign(last, { low: delivered, avg: delivered, high: delivered });
    const running: Stats = { low: delivered, avg: delivered, high: delivered };
    for (let i = input.currentIndex; i < input.currentIndex + horizon; i += 1) {
      const capacity = input.futureCapacity(i);
      for (const tempo of TEMPI) running[tempo] += stats[tempo] * capacity;
      series.push({ index: i, actual: null, ...running });
    }
  }

  const milestones = input.thresholds.map((m) => {
    const hit = series.find((p) => p.actual !== null && p.actual >= m.points);
    const at = { low: null, avg: null, high: null } as Record<Tempo, number | null>;
    if (!hit && stats) {
      for (const tempo of TEMPI) {
        at[tempo] =
          series.find((p) => p.actual === null && (p[tempo] ?? 0) >= m.points)?.index ?? null;
      }
    }
    return { id: m.id, threshold: m.points, reachedAt: hit?.index ?? null, at };
  });

  return { stats, delivered, series, milestones };
}

/** Cost of every quarter from the programme's first (index 0) up to and including `index`. */
export function costUntil(index: number, costPerQuarter: number | null): number | null {
  return costPerQuarter === null ? null : (index + 1) * costPerQuarter;
}
