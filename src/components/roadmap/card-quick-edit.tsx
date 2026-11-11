"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { updateItemAction } from "@/actions/items";
import type { BacklogOptions } from "@/components/backlog/types";
import { Button, Input, Select } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/segmented";
import type { Size } from "@/db/schema";
import { LEVEL_SIZES } from "@/domain/sizes";
import type { BoardCard } from "@/lib/roadmap-view";

/**
 * The few key facts of a card, edited where it stands on the roadmap: its
 * title, its size and what it belongs to (a feature's business goal, a
 * goal's milestone). Everything else stays as it is; the backlog has the
 * full editor.
 */
export function CardQuickEdit({
  card,
  options,
  onClose,
}: {
  card: BoardCard;
  options: BacklogOptions;
  onClose: () => void;
}) {
  const t = useTranslations("backlog");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const isGoal = card.kind === "goal";
  const [title, setTitle] = useState(card.title);
  const [size, setSize] = useState<Size | null>(card.size);
  const [owner, setOwner] = useState((isGoal ? card.milestoneId : card.parentId) ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = (k: string) => `quick-${card.id}-${k}`;

  const save = () =>
    startTransition(async () => {
      const parentId = isGoal || owner === "" ? null : owner;
      const result = await updateItemAction({
        itemId: card.id,
        title,
        description: card.description,
        size,
        pointsOverride: card.pointsOverride,
        integration: card.integration,
        status: card.status,
        doneQuarter: card.doneQuarter,
        doneNote: card.doneNote,
        parentId,
        // A goal's milestone is the one chosen; a feature without a goal keeps its own.
        milestoneId: isGoal ? owner || null : parentId ? null : card.milestoneId,
        periodIndex: card.periodIndex,
        periodSpan: card.periodSpan,
      });
      if (!result.ok) return setError(errors(result.error));
      onClose();
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-2 border-t border-hairline-soft pt-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) save();
      }}
    >
      <label className="sr-only" htmlFor={id("title")}>
        {t("editor.title")}
      </label>
      <Input
        id={id("title")}
        autoFocus
        maxLength={200}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-8 text-[13px]"
      />
      <Segmented<Size | "none">
        name={id("size")}
        label={t("editor.size")}
        value={size ?? "none"}
        options={[
          { value: "none", label: "–", title: t("editor.noSize") },
          ...LEVEL_SIZES[card.kind].map((s) => ({
            value: s,
            label: s,
            title: t("editor.sizeTitle", { points: options.sizePoints[card.kind][s] ?? 0 }),
          })),
        ]}
        onChange={(s) => setSize(s === "none" ? null : s)}
      />
      <label className="sr-only" htmlFor={id("owner")}>
        {isGoal ? t("editor.milestone") : t("editor.parent")}
      </label>
      <Select
        id={id("owner")}
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        className="h-8 text-[12px]"
      >
        <option value="">{isGoal ? t("board.noMilestone") : t("board.noGoal")}</option>
        {(isGoal ? options.milestones : options.goals).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" onClick={onClose}>
          {common("cancel")}
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={pending || !title.trim()}>
          {pending ? common("saving") : common("save")}
        </Button>
      </div>
    </form>
  );
}
