"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  addGoalAction,
  deleteGoalAction,
  saveDraftAction,
  updateGoalAction,
} from "@/actions/report";
import type { Option } from "@/components/backlog/types";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { StatusMessage, useStatus, type Status } from "@/components/ui/status";
import type { GoalStatus, QuarterGoal } from "@/db/schema";

const STATUSES: GoalStatus[] = ["open", "achieved", "partial", "missed"];

/** The report's texts and the quarter whose goals it shows, saved together. */
export function DraftEditor({
  programId,
  draft,
  quarters,
  goalsQuarter,
}: {
  programId: string;
  draft: { statusText: string; changeText: string; goalsQuarter: number | null };
  quarters: Option[];
  goalsQuarter: number;
}) {
  const t = useTranslations("report.editor");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({ ...draft, goalsQuarter });
  return (
    <form
      className="grid grid-cols-2 gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveDraftAction({ programId, ...v });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setStatus({ kind: "ok", text: t("saved") });
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-status">{t("statusText")}</Label>
        <Textarea
          id="draft-status"
          rows={6}
          maxLength={8000}
          value={v.statusText}
          placeholder={t("statusPlaceholder")}
          onChange={(e) => setV({ ...v, statusText: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-change">{t("changeText")}</Label>
        <Textarea
          id="draft-change"
          rows={6}
          maxLength={8000}
          value={v.changeText}
          placeholder={t("changePlaceholder")}
          onChange={(e) => setV({ ...v, changeText: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-quarter">{t("goalsQuarter")}</Label>
        <Select
          id="draft-quarter"
          value={String(v.goalsQuarter)}
          onChange={(e) => setV({ ...v, goalsQuarter: Number(e.target.value) })}
        >
          {quarters.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-end gap-4">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? common("saving") : t("saveTexts")}
        </Button>
        <StatusMessage status={status} />
      </div>
    </form>
  );
}

/** The goals for the chosen quarter: numbered goals, sub-goals under them, stretch goals marked. */
export function GoalsEditor({
  programId,
  quarterIndex,
  quarterLabel,
  goals,
}: {
  programId: string;
  quarterIndex: number;
  quarterLabel: string;
  goals: QuarterGoal[];
}) {
  const t = useTranslations("report.goals");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [parent, setParent] = useState("");
  const [stretch, setStretch] = useState(false);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const top = goals.filter((g) => g.parentId === null);

  return (
    <div className="flex flex-col gap-4">
      {top.length === 0 ? (
        <p className="text-sm text-slate">{t("empty", { quarter: quarterLabel })}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {top.map((g, i) => (
            <li key={g.id} className="flex flex-col gap-2">
              <GoalRow goal={g} code={`${i + 1}`} onStatus={setStatus} />
              {goals
                .filter((c) => c.parentId === g.id)
                .map((c, k) => (
                  <GoalRow key={c.id} goal={c} code={`${i + 1}.${k + 1}`} onStatus={setStatus} />
                ))}
            </li>
          ))}
        </ol>
      )}
      <form
        className="grid grid-cols-[1fr_14rem_auto_auto] items-end gap-3 border-t border-hairline-soft pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          startTransition(async () => {
            const result = await addGoalAction({
              programId,
              quarterIndex,
              title,
              parentId: parent || null,
              stretch,
            });
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            setTitle("");
            setStretch(false);
            router.refresh();
          });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-title">{t("new", { quarter: quarterLabel })}</Label>
          <Input
            id="goal-title"
            maxLength={400}
            value={title}
            placeholder={t("placeholder")}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-parent">{t("under")}</Label>
          <Select id="goal-parent" value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">{t("topLevel")}</option>
            {top.map((g, i) => (
              <option key={g.id} value={g.id}>{`${i + 1}. ${g.title}`}</option>
            ))}
          </Select>
        </div>
        <label className="flex h-10 items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-ink)]"
            checked={stretch}
            onChange={(e) => setStretch(e.target.checked)}
          />
          {t("stretch")}
        </label>
        <Button type="submit" disabled={pending || !title.trim()}>
          {t("add")}
        </Button>
      </form>
      <StatusMessage status={status} />
    </div>
  );
}

function GoalRow({
  goal,
  code,
  onStatus,
}: {
  goal: QuarterGoal;
  code: string;
  onStatus: (s: Status) => void;
}) {
  const t = useTranslations("report.goals");
  const tr = useTranslations("report");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState(goal.title);
  const save = (patch: Partial<{ title: string; stretch: boolean; status: GoalStatus }>) =>
    startTransition(async () => {
      const result = await updateGoalAction({
        goalId: goal.id,
        title,
        stretch: goal.stretch,
        status: goal.status,
        ...patch,
      });
      if (!result.ok) return onStatus({ kind: "error", text: errors(result.error) });
      router.refresh();
    });
  return (
    <div className="grid grid-cols-[2.5rem_1fr_auto_10rem_auto] items-center gap-3">
      <span className="tabular text-[13px] font-bold text-bronze-deep">{code}</span>
      <label className="sr-only" htmlFor={`goal-${goal.id}`}>
        {t("titleFor", { code })}
      </label>
      <Input
        id={`goal-${goal.id}`}
        maxLength={400}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => title.trim() && title !== goal.title && save({ title })}
      />
      <label className="flex items-center gap-1.5 text-[12px]">
        <input
          type="checkbox"
          className="size-4 accent-[var(--color-ink)]"
          checked={goal.stretch}
          onChange={(e) => save({ stretch: e.target.checked })}
        />
        {t("stretch")}
      </label>
      <label className="sr-only" htmlFor={`goal-status-${goal.id}`}>
        {t("statusFor", { code })}
      </label>
      <Select
        id={`goal-status-${goal.id}`}
        value={goal.status}
        onChange={(e) => save({ status: e.target.value as GoalStatus })}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {tr(`goalStatus.${s}`)}
          </option>
        ))}
      </Select>
      <button
        type="button"
        aria-label={t("deleteFor", { code })}
        className="rounded p-2 text-slate hover:bg-sand hover:text-danger"
        onClick={() =>
          startTransition(async () => {
            const result = await deleteGoalAction({ goalId: goal.id });
            if (!result.ok) return onStatus({ kind: "error", text: errors(result.error) });
            router.refresh();
          })
        }
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </div>
  );
}
