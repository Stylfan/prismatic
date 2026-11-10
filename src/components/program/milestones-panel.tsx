"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addMilestoneAction } from "@/actions/programs";
import { Button, Input } from "@/components/ui/controls";
import { Panel } from "@/components/ui/layout";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { MilestoneRow, type MilestoneRowView } from "./milestone-row";

/** The programme's milestones in order, each building on the ones before it. */
export function MilestonesPanel({
  programId,
  milestones,
}: {
  programId: string;
  milestones: MilestoneRowView[];
}) {
  const t = useTranslations("milestones");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  return (
    <Panel className="flex flex-col gap-5">
      {milestones.length === 0 ? (
        <p className="text-sm text-slate">{t("empty")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-hairline-soft">
          {milestones.map((m, i) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              first={i === 0}
              last={i === milestones.length - 1}
              onStatus={setStatus}
            />
          ))}
        </ol>
      )}
      <form
        className="flex flex-wrap items-end gap-3 border-t border-hairline-soft pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          startTransition(async () => {
            const result = await addMilestoneAction({ programId, title });
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            setTitle("");
            router.refresh();
          });
        }}
      >
        <label htmlFor="new-milestone" className="sr-only">
          {t("addLabel")}
        </label>
        <Input
          id="new-milestone"
          value={title}
          maxLength={120}
          placeholder={t("addPlaceholder")}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-56 flex-1"
        />
        <Button type="submit" disabled={pending || !title.trim()}>
          {t("add")}
        </Button>
      </form>
      <StatusMessage status={status} />
    </Panel>
  );
}
