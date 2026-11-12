"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  moveMilestoneAction,
  setMilestoneDoneAction,
  updateMilestoneAction,
} from "@/actions/programs";
import type { Result } from "@/actions/result";
import { Button, Input, Label, Textarea } from "@/components/ui/controls";
import { HintIcon } from "@/components/ui/hint-icon";
import type { Status } from "@/components/ui/status";
import { MAX_POINTS } from "@/domain/sizes";
import { cn } from "@/lib/cn";
import { RemoveMilestone } from "./remove-milestone";

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

/**
 * One milestone on one line: its code and name, its own guestimate, reached
 * or not, its place in the order and a bin. A click on the name opens its
 * name, description and own guestimate to edit.
 */
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
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [description, setDescription] = useState(milestone.description);
  const [scope, setScope] = useState(milestone.scopeOverride?.toString() ?? "");
  const code = t("code", { seq: milestone.seq });
  const id = (name: string) => `ms-${milestone.id}-${name}`;
  const own = milestone.scopeOverride ?? milestone.computed;

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
    <li className="flex flex-col">
      <div className="grid grid-cols-[1.25rem_minmax(0,1fr)_9rem_5rem_4.5rem_1.75rem] items-center gap-3 py-2.5">
        <ChevronRight
          className={cn("size-4 text-slate transition-transform", open && "rotate-90")}
          aria-hidden
        />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 items-center gap-2 text-left text-[14px] font-medium text-ink hover:underline"
        >
          <span className="shrink-0 rounded-full bg-ink px-1.5 text-[11px] leading-5 font-semibold text-paper tabular">
            {code}
          </span>
          <span className="truncate">{milestone.title}</span>
        </button>
        <span
          className="text-right text-[13px] text-slate tabular"
          title={milestone.scopeOverride === null ? t("fromGoals") : undefined}
        >
          {t("points", { points: own.toLocaleString("da-DK") })}
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
        <span className="flex items-center">
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
        </span>
        <RemoveMilestone milestoneId={milestone.id} name={`${code}: ${milestone.title}`} />
      </div>
      {open && (
        <form
          className="mb-3 ml-8 grid gap-3 rounded-lg border border-hairline-soft bg-paper/60 p-4 sm:grid-cols-[minmax(0,1fr)_11rem]"
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
            <Label className="text-[12px] text-slate" htmlFor={id("title")}>
              {t("titleLabel")}
            </Label>
            <Input
              quiet
              id={id("title")}
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              className="flex items-center gap-1.5 text-[12px] text-slate"
              htmlFor={id("scope")}
            >
              {t("scope")}
              <HintIcon text={t("scopeHint")} />
            </Label>
            <Input
              quiet
              id={id("scope")}
              type="number"
              min={0}
              max={MAX_POINTS}
              inputMode="numeric"
              className="tabular"
              placeholder={milestone.computed.toLocaleString("da-DK")}
              value={scope}
              aria-invalid={!scopeValid}
              onChange={(e) => setScope(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-[12px] text-slate" htmlFor={id("description")}>
              {t("description")}
            </Label>
            <Textarea
              quiet
              id={id("description")}
              rows={2}
              maxLength={600}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <span className="text-[12px] text-slate">
              {t("cumulative", { code })}: {milestone.cumulative.toLocaleString("da-DK")}
            </span>
            <span className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                {common("cancel")}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={pending || !changed || !title.trim() || !scopeValid}
              >
                {common("save")}
              </Button>
            </span>
          </div>
        </form>
      )}
    </li>
  );
}
