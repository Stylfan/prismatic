"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteItemAction, updateItemAction } from "@/actions/items";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/segmented";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { ItemStatus, Size, Track } from "@/db/schema";
import { LEVEL_SIZES, MAX_POINTS } from "@/domain/sizes";
import { SplitDialog } from "./split-dialog";
import { periodValue, parsePeriod, type BacklogOptions, type ItemView } from "./types";
import { WarningList } from "./warning-list";

const ITEM_STATUSES: ItemStatus[] = ["planned", "in_progress", "done"];

/**
 * Everything about one card, in the side panel beside the list: small
 * button groups for status, size and track, and fields only where a value
 * has to be typed or picked from a long list. Saved in one go.
 */
export function ItemEditor({
  item,
  options,
  onClose,
}: {
  item: ItemView;
  options: BacklogOptions;
  onClose: () => void;
}) {
  const t = useTranslations("backlog");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({
    title: item.title,
    description: item.description,
    track: item.track,
    size: item.size,
    points: item.pointsOverride?.toString() ?? "",
    integration: item.integration,
    status: item.status,
    doneQuarter: item.doneQuarter ?? options.currentQuarter,
    doneNote: item.doneNote,
    parentId: item.parentId ?? "",
    milestoneId: item.milestoneId ?? "",
    period: periodValue(item.periodIndex, item.periodSpan),
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));
  const id = (name: string) => `item-${item.id}-${name}`;
  const isGoal = item.kind === "goal";
  const sizePoints = v.size ? options.sizePoints[item.kind][v.size] : undefined;
  const parsedPoints = v.points.trim() === "" ? null : Math.round(Number(v.points));
  const pointsValid =
    parsedPoints === null ||
    (Number.isFinite(parsedPoints) && parsedPoints >= 0 && parsedPoints <= MAX_POINTS);
  const showMilestone = isGoal || v.parentId === "";

  const save = () =>
    startTransition(async () => {
      const result = await updateItemAction({
        itemId: item.id,
        title: v.title,
        description: v.description,
        track: v.track,
        size: v.size,
        pointsOverride: parsedPoints,
        integration: v.integration,
        status: v.status,
        doneQuarter: v.status === "done" ? v.doneQuarter : null,
        doneNote: v.doneNote,
        parentId: isGoal || v.parentId === "" ? null : v.parentId,
        milestoneId: showMilestone && v.milestoneId !== "" ? v.milestoneId : null,
        ...parsePeriod(v.period),
      });
      if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
      setStatus({ kind: "ok", text: t("editor.saved", { title: v.title.trim() }) });
      router.refresh();
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (v.title.trim() && pointsValid) save();
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-slate">
          {isGoal ? t("kind.goalLong") : t("kind.featureLong")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("row.close")}
          className="rounded p-1 text-slate hover:bg-sand hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <Field label={t("editor.title")} htmlFor={id("title")}>
        <Input
          id={id("title")}
          required
          maxLength={160}
          value={v.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </Field>

      <Field label={t("status.label")}>
        <Segmented
          name={id("status")}
          label={t("status.label")}
          value={v.status}
          options={ITEM_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
          onChange={(s) => set("status", s)}
        />
      </Field>
      {v.status === "done" && (
        <Field label={t("editor.doneQuarter")} htmlFor={id("doneq")}>
          <Select
            id={id("doneq")}
            value={String(v.doneQuarter)}
            onChange={(e) => set("doneQuarter", Number(e.target.value))}
          >
            {options.doneQuarters.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={t("editor.size")}>
        <Segmented<Size | "none">
          name={id("size")}
          label={t("editor.size")}
          value={v.size ?? "none"}
          options={[
            { value: "none", label: "–", title: t("editor.noSize") },
            ...LEVEL_SIZES[item.kind].map((s) => ({
              value: s,
              label: s,
              title: t("editor.sizeTitle", { points: options.sizePoints[item.kind][s] ?? 0 }),
            })),
          ]}
          onChange={(s) => set("size", s === "none" ? null : s)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("editor.points")} htmlFor={id("points")}>
          <Input
            id={id("points")}
            type="number"
            min={0}
            max={MAX_POINTS}
            inputMode="numeric"
            className="tabular"
            value={v.points}
            aria-invalid={!pointsValid}
            placeholder={sizePoints !== undefined ? String(sizePoints) : "–"}
            onChange={(e) => set("points", e.target.value)}
          />
        </Field>
        <Field label={t("editor.period")} htmlFor={id("period")}>
          <Select
            id={id("period")}
            value={v.period}
            onChange={(e) => set("period", e.target.value)}
          >
            <option value="">{t("row.unplanned")}</option>
            {options.periods.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!isGoal && (
        <Field label={t("editor.parent")} htmlFor={id("parent")}>
          <Select
            id={id("parent")}
            value={v.parentId}
            onChange={(e) => set("parentId", e.target.value)}
          >
            <option value="">{t("editor.none")}</option>
            {options.goals.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {showMilestone && (
        <Field label={t("editor.milestone")} htmlFor={id("milestone")}>
          <Select
            id={id("milestone")}
            value={v.milestoneId}
            onChange={(e) => set("milestoneId", e.target.value)}
          >
            <option value="">{t("editor.none")}</option>
            {options.milestones.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <Field label={t("track.label")}>
        <Segmented<Track>
          name={id("track")}
          label={t("track.label")}
          value={v.track}
          options={[
            { value: "business", label: t("track.business") },
            { value: "technical", label: t("track.technical") },
          ]}
          onChange={(tr) => set("track", tr)}
        />
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-ink)]"
          checked={v.integration}
          onChange={(e) => set("integration", e.target.checked)}
        />
        {t("editor.integration")}
      </label>

      <Field label={t("editor.description")} htmlFor={id("desc")}>
        <Textarea
          id={id("desc")}
          rows={3}
          maxLength={2000}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      {v.status === "done" && (
        <Field label={t("editor.doneNote")} htmlFor={id("note")}>
          <Textarea
            id={id("note")}
            rows={2}
            maxLength={2000}
            value={v.doneNote}
            onChange={(e) => set("doneNote", e.target.value)}
          />
        </Field>
      )}

      <WarningList warnings={item.warnings} />
      {item.splitFromTitle && (
        <p className="text-xs text-slate">{t("row.splitFrom", { title: item.splitFromTitle })}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline-soft pt-4">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending || !v.title.trim() || !pointsValid}
        >
          {pending ? common("saving") : t("editor.save")}
        </Button>
        {!isGoal && item.status !== "done" && <SplitDialog item={item} options={options} />}
        <span className="flex-1" />
        <ConfirmButton
          label={t("editor.delete")}
          question={t("editor.deleteQuestion", { title: item.title })}
          detail={isGoal ? t("editor.deleteDetailGoal") : t("editor.deleteDetailFeature")}
          confirmLabel={t("editor.delete")}
          cancelLabel={common("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              const result = await deleteItemAction({ itemId: item.id });
              if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
              onClose();
              router.refresh();
            })
          }
        />
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {htmlFor ? (
        <Label htmlFor={htmlFor}>{label}</Label>
      ) : (
        <span className="text-[13px] font-medium text-ink">{label}</span>
      )}
      {children}
    </div>
  );
}
