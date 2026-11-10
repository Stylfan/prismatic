"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createItemAction } from "@/actions/items";
import { Button, Input, Label, Select } from "@/components/ui/controls";
import { Panel } from "@/components/ui/layout";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { ItemKind } from "@/db/schema";
import { cn } from "@/lib/cn";
import type { BacklogOptions } from "./types";

/**
 * Adds a business goal or a feature in one line: the kind, a title and
 * the one link that matters for it — a goal's milestone, a feature's goal.
 * Everything else is filled in on the card afterwards.
 */
export function AddItemForm({
  programId,
  options,
}: {
  programId: string;
  options: BacklogOptions;
}) {
  const t = useTranslations("backlog.add");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [kind, setKind] = useState<ItemKind>("goal");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const linkOptions = kind === "goal" ? options.milestones : options.goals;

  return (
    <Panel>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          startTransition(async () => {
            const result = await createItemAction({
              programId,
              kind,
              title,
              parentId: kind === "feature" && link ? link : null,
              milestoneId: kind === "goal" && link ? link : null,
            });
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            setStatus({ kind: "ok", text: t("added", { title: title.trim() }) });
            setTitle("");
            router.refresh();
          });
        }}
      >
        <fieldset className="flex flex-wrap items-center gap-3">
          <legend className="sr-only">{t("kindLabel")}</legend>
          <span className="text-sm font-semibold" aria-hidden>
            {t("title")}
          </span>
          <div className="flex rounded-full border border-hairline p-0.5">
            {(["goal", "feature"] as const).map((k) => (
              <label
                key={k}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink",
                  kind === k ? "bg-ink text-paper" : "text-slate hover:text-ink",
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  checked={kind === k}
                  onChange={() => {
                    setKind(k);
                    setLink("");
                  }}
                  className="sr-only"
                />
                {t(k)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-[1fr_16rem_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-title">{t("titleLabel")}</Label>
            <Input
              id="add-title"
              required
              maxLength={160}
              value={title}
              placeholder={kind === "goal" ? t("goalPlaceholder") : t("featurePlaceholder")}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="add-link">{kind === "goal" ? t("milestone") : t("parent")}</Label>
            <Select id="add-link" value={link} onChange={(e) => setLink(e.target.value)}>
              <option value="">{t("none")}</option>
              {linkOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
            {t("submit")}
          </Button>
        </div>
        <StatusMessage status={status} />
      </form>
    </Panel>
  );
}
