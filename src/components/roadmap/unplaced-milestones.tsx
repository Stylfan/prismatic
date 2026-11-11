"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import type { BoardColumn, BoardMilestone } from "@/lib/roadmap-view";
import { MilestoneChip } from "./milestone-chip";
import type { useBoardDrag } from "./use-board-drag";

/**
 * The milestones not yet placed on the roadmap, one under the other. They
 * are dragged from here to the column where they should be reached, and a
 * placed one dragged back here is unplaced again.
 */
export function UnplacedMilestones({
  milestones,
  columns,
  pending,
  drag,
  onPlace,
}: {
  milestones: BoardMilestone[];
  columns: BoardColumn[];
  pending: boolean;
  drag: ReturnType<typeof useBoardDrag>;
  onPlace: (m: BoardMilestone, column: number | null) => void;
}) {
  const t = useTranslations("roadmap.unplacedList");
  const area = drag.area("unplaced", ["milestone"]);
  return (
    <section aria-labelledby="unplaced-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="unplaced-title" className="text-[15px] font-semibold text-ink">
          {t("title")}
        </h2>
        <p className="text-[13px] leading-relaxed text-slate">{t("lead")}</p>
      </div>
      <div
        onDragOver={area.onDragOver}
        onDrop={area.onDrop}
        className={cn(
          "flex flex-1 flex-col rounded-lg border border-dashed border-hairline p-3 transition-colors",
          area.over && "bg-sand ring-2 ring-ink/20",
        )}
      >
        {milestones.length === 0 ? (
          <p className="text-[13px] text-slate">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {milestones.map((m) => (
              <MilestoneChip
                key={m.id}
                milestone={m}
                columns={columns}
                onPlace={onPlace}
                pending={pending}
                drag={drag.piece("milestone", m.id, "unplaced")}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
