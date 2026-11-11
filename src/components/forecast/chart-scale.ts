import type { ForecastResult } from "@/domain/forecast";

/**
 * The forecast chart's frame, worked out from the numbers: how many quarters
 * it shows, how high the scale goes and where its figures sit. Kept apart
 * from the drawing so it can be tested.
 */

export function chartScale(input: {
  result: ForecastResult;
  milestones: Array<{ id: string; threshold: number }>;
  currentIndex: number;
}) {
  const { result, milestones, currentIndex } = input;
  // Show until the low tempo has passed every milestone, at least two years ahead, at most ten.
  const lastNeeded = Math.max(
    currentIndex + 8,
    ...milestones.map((m) => {
      const f = result.milestones.find((x) => x.id === m.id);
      return f?.at.low ?? f?.at.avg ?? currentIndex;
    }),
  );
  const maxIndex = Math.min(lastNeeded + 1, currentIndex + 40);
  // The scale follows the milestones and what is delivered; forecast lines
  // that climb past the last milestone are cut at the top.
  const top = Math.max(
    ...milestones.map((m) => m.threshold * 1.08),
    ...result.series.filter((p) => p.index <= maxIndex).map((p) => p.actual ?? 0),
    1,
  );
  const step = niceStep(top / 6);
  const yMax = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, k) => k * step);
  return { maxIndex, yMax, ticks };
}

/** A round step near `raw`: 1, 2, 2.5 or 5 times a power of ten, so 6.000 reads in thousands. */
export function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
}

/**
 * Places labels as near their own height as they can go without touching:
 * where two would be closer than `gap`, the lower one moves down, and if the
 * last runs out of room, the stack moves up. Returns each label's position.
 */
export function spreadLabels(
  items: Array<{ id: string; at: number }>,
  gap: number,
  height: number,
): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.at - b.at);
  const placed = sorted.map((i) => i.at);
  for (let k = 1; k < placed.length; k += 1) {
    placed[k] = Math.max(placed[k]!, placed[k - 1]! + gap);
  }
  const overflow = (placed.at(-1) ?? 0) - height;
  if (overflow > 0) {
    for (let k = placed.length - 1; k >= 0; k -= 1) {
      const limit = k === placed.length - 1 ? height : placed[k + 1]! - gap;
      placed[k] = Math.min(placed[k]!, limit);
    }
  }
  return new Map(sorted.map((i, k) => [i.id, placed[k]!]));
}
