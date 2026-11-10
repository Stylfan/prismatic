"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  moveMilestoneAction,
  removeMilestoneAction,
  setMilestoneDoneAction,
  updateMilestoneAction,
} from "@/actions/programs";
import type { Result } from "@/actions/result";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button, Hint, Input, Label, Textarea } from "@/components/ui/controls";
import type { Status } from "@/components/ui/status";
import { MAX_POINTS } from "@/domain/sizes";

export type MilestoneRowView = {
  id: string;
  seq: number;
  title: string;
  description: string;
  scopeOverride: number | null;
  done: boolean;
  /** Its own points computed from its goals, shown when no scope is typed. */
  computed: number;
  /** Its own points plus every earlier milestone's. */
  cumulative: number;
};

/** One milestone: number, name, description, own scope, running total and place in the order. */
export function MilestoneRow({
  milestone,
  first,
  last,
  onStatus,
}: {
  milestone: MilestoneRowView;
  first: boolean;
  last: boolean;
  onStatus: (s: Status) => void;
}) {
  const t = useTranslations("milestones");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description);
  const [scope, setScope] = useState(milestone.scopeOverride?.toString() ?? "");
  const code = t("code", { seq: milestone.seq });
  const id = (name: string) => `ms-${milestone.id}-${name}`;

  const parsedScope = scope.trim() === "" ? null : Math.round(Number(scope));
  const scopeValid =
    parsedScope === null ||
    (Number.isFinite(parsedScope) && parsedScope >= 0 && parsedScope <= MAX_POINTS);
  const changed =
    title.trim() !== milestone.title ||
    description.trim() !== milestone.description ||
    parsedScope !== milestone.scopeOverride;

  const run = (call: () => Promise<Result<string>>, success?: string) =>
    startTransition(async () => {
      const result = await call();
      if (!result.ok) return onStatus({ kind: "error", text: errors(result.error) });
      if (success) onStatus({ kind: "ok", text: success });
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-4 py-5 first:pt-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tabular rounded-sm bg-ink px-2 py-1 text-[12px] font-bold tracking-[0.08em] text-paper">
          {code}
        </span>
        <span className="flex-1 text-[13px] text-slate">
          {t("cumulative", { code })}:{" "}
          <span className="tabular font-semibold text-ink">
            {t("points", { points: milestone.cumulative.toLocaleString("da-DK") })}
          </span>
        </span>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-ink)]"
            checked={milestone.done}
            disabled={pending}
            onChange={(e) =>
              run(() =>
                setMilestoneDoneAction({ milestoneId: milestone.id, done: e.target.checked }),
              )
            }
          />
          {t("done")}
        </label>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending || first}
          aria-label={t("up", { code })}
          onClick={() =>
            run(() => moveMilestoneAction({ milestoneId: milestone.id, direction: "up" }))
          }
        >
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending || last}
          aria-label={t("down", { code })}
          onClick={() =>
            run(() => moveMilestoneAction({ milestoneId: milestone.id, direction: "down" }))
          }
        >
          <ArrowDown className="size-4" aria-hidden />
        </Button>
      </div>
      <form
        className="grid gap-4 sm:grid-cols-[1fr_11rem]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim() || !scopeValid) return;
          run(
            () =>
              updateMilestoneAction({
                milestoneId: milestone.id,
                title,
                description,
                scopeOverride: parsedScope,
              }),
            t("saved", { code }),
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("title")}>{t("titleLabel")}</Label>
          <Input
            id={id("title")}
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("scope")}>{t("scope")}</Label>
          <Input
            id={id("scope")}
            type="number"
            min={0}
            max={MAX_POINTS}
            inputMode="numeric"
            className="tabular"
            placeholder={t("scopeComputed", { points: milestone.computed.toLocaleString("da-DK") })}
            value={scope}
            aria-invalid={!scopeValid}
            aria-describedby={id("scope-hint")}
            onChange={(e) => setScope(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={id("description")}>{t("description")}</Label>
          <Textarea
            id={id("description")}
            rows={2}
            maxLength={600}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Hint id={id("scope-hint")}>{t("scopeHint")}</Hint>
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending || !changed || !title.trim() || !scopeValid}
          >
            {common("save")}
          </Button>
          <ConfirmButton
            label={t("remove")}
            question={t("removeQuestion", { code })}
            detail={t("removeDetail")}
            confirmLabel={t("remove")}
            cancelLabel={common("cancel")}
            onConfirm={() => run(() => removeMilestoneAction({ milestoneId: milestone.id }))}
          />
        </div>
      </form>
    </li>
  );
}
