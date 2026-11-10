"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createProgramAction } from "@/actions/programs";
import { Button } from "@/components/ui/controls";
import { Panel } from "@/components/ui/layout";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { ProgramFields, type ProgramValues } from "./program-fields";

/** A programme is a name, a purpose and how its periods run; the content comes afterwards. */
export function NewProgramForm({ today }: { today: string }) {
  const t = useTranslations("create");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [values, setValues] = useState<ProgramValues>({
    name: "",
    goal: "",
    periodModel: "seasons",
    startDate: today,
    quarterHorizon: 2,
    costPerQuarter: null,
    deviationPct: 10,
  });

  return (
    <Panel>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await createProgramAction(values);
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            router.push(`/programs/${result.data}`);
          });
        }}
      >
        <ProgramFields values={values} onChange={setValues} idPrefix="new-program" />
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? t("creating") : t("submit")}
          </Button>
          <StatusMessage status={status} />
        </div>
      </form>
    </Panel>
  );
}
