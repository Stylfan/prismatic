"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addEventAction } from "@/actions/roadmap";
import type { Option } from "@/components/backlog/types";
import { Button, Input, Label, Select } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";

/** Adds an event to a quarter: onboarding, a workshop, an estimation day, holidays, a strike. */
export function EventForm({ programId, quarters }: { programId: string; quarters: Option[] }) {
  const t = useTranslations("roadmap.events");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [quarter, setQuarter] = useState(quarters[0]?.value ?? "");
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();

  return (
    <form
      className="grid grid-cols-[11rem_1fr_auto] items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || quarter === "") return;
        startTransition(async () => {
          const result = await addEventAction({ programId, quarterIndex: Number(quarter), title });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setTitle("");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-quarter">{t("quarter")}</Label>
        <Select id="event-quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {quarters.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-title">{t("title")}</Label>
        <Input
          id="event-title"
          maxLength={120}
          value={title}
          placeholder={t("placeholder")}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending || !title.trim()}>
        {t("add")}
      </Button>
      <StatusMessage status={status} className="col-span-3" />
    </form>
  );
}
