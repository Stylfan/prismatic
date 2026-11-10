"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { splitFeatureAction } from "@/actions/items";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { Size } from "@/db/schema";
import { LEVEL_SIZES, MAX_POINTS } from "@/domain/sizes";
import { parsePeriod, periodValue, type BacklogOptions, type ItemView } from "./types";

/**
 * Splits a feature that is partly done. The dialog sits inside the
 * editor's form, so it uses no form of its own; its buttons act directly.
 */
export function SplitDialog({ item, options }: { item: ItemView; options: BacklogOptions }) {
  const t = useTranslations("backlog.split");
  const common = useTranslations("common");
  const editor = useTranslations("backlog.editor");
  const errors = useTranslations("errors");
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({
    delivered: "",
    doneNote: "",
    doneQuarter: options.currentQuarter,
    newTitle: t("newTitleDefault", { title: item.title }),
    newParentId: item.parentId ?? "",
    newSize: null as Size | null,
    newPoints: "",
    newPeriod: periodValue(item.periodIndex, item.periodSpan),
  });
  const set = <K extends keyof typeof v>(key: K, value: (typeof v)[K]) =>
    setV((prev) => ({ ...prev, [key]: value }));
  const id = (name: string) => `split-${item.id}-${name}`;
  const num = (s: string) => (s.trim() === "" ? null : Math.round(Number(s)));
  const delivered = num(v.delivered);
  const newPoints = num(v.newPoints);
  const valid =
    delivered !== null &&
    delivered >= 0 &&
    delivered <= MAX_POINTS &&
    (newPoints === null || (newPoints >= 0 && newPoints <= MAX_POINTS)) &&
    v.newTitle.trim() !== "";

  const submit = () =>
    startTransition(async () => {
      const period = parsePeriod(v.newPeriod);
      const result = await splitFeatureAction({
        itemId: item.id,
        deliveredPoints: delivered,
        doneNote: v.doneNote,
        doneQuarter: v.doneQuarter,
        newTitle: v.newTitle,
        newParentId: v.newParentId === "" ? null : v.newParentId,
        newSize: v.newSize,
        newPointsOverride: newPoints,
        newPeriodIndex: period.periodIndex,
        newPeriodSpan: period.periodSpan,
      });
      if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
      ref.current?.close();
      router.refresh();
    });

  return (
    <>
      <Button size="sm" onClick={() => ref.current?.showModal()}>
        {editor("split")}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby={id("title")}
        onKeyDown={(e) => {
          // The dialog sits inside the editor form; Enter must not save that form.
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
        }}
        className="m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 id={id("title")} className="text-lg font-semibold">
          {t("title", { title: item.title })}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">{t("lead")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("delivered")}>{t("delivered")}</Label>
            <Input
              id={id("delivered")}
              type="number"
              min={0}
              max={MAX_POINTS}
              className="tabular"
              value={v.delivered}
              onChange={(e) => set("delivered", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("doneq")}>{t("doneQuarter")}</Label>
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
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={id("note")}>{t("doneNote")}</Label>
            <Textarea
              id={id("note")}
              rows={2}
              maxLength={2000}
              value={v.doneNote}
              onChange={(e) => set("doneNote", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={id("newtitle")}>{t("newTitle")}</Label>
            <Input
              id={id("newtitle")}
              maxLength={160}
              value={v.newTitle}
              onChange={(e) => set("newTitle", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("parent")}>{t("newParent")}</Label>
            <Select
              id={id("parent")}
              value={v.newParentId}
              onChange={(e) => set("newParentId", e.target.value)}
            >
              <option value="">{editor("none")}</option>
              {options.goals.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("period")}>{t("newPeriod")}</Label>
            <Select
              id={id("period")}
              value={v.newPeriod}
              onChange={(e) => set("newPeriod", e.target.value)}
            >
              <option value="">{editor("none")}</option>
              {options.periods.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("size")}>{t("newSize")}</Label>
            <Select
              id={id("size")}
              value={v.newSize ?? ""}
              onChange={(e) =>
                set("newSize", e.target.value === "" ? null : (e.target.value as Size))
              }
            >
              <option value="">{editor("noSize")}</option>
              {LEVEL_SIZES.feature.map((s) => (
                <option key={s} value={s}>
                  {s} · {options.sizePoints.feature[s] ?? 0}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("points")}>{t("newPoints")}</Label>
            <Input
              id={id("points")}
              type="number"
              min={0}
              max={MAX_POINTS}
              className="tabular"
              value={v.newPoints}
              onChange={(e) => set("newPoints", e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <StatusMessage status={status} className="mr-auto" />
          <Button variant="ghost" size="sm" onClick={() => ref.current?.close()}>
            {common("cancel")}
          </Button>
          <Button variant="primary" size="sm" disabled={pending || !valid} onClick={submit}>
            {t("submit")}
          </Button>
        </div>
      </dialog>
    </>
  );
}
