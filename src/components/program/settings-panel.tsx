"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteProgramAction, updateProgramAction } from "@/actions/programs";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import { ProgramFields, type ProgramValues } from "./program-fields";

/** The programme's settings, editable in place, and the way out: deleting it. */
export function SettingsPanel({
  programId,
  initial,
  today,
}: {
  programId: string;
  initial: ProgramValues;
  today: string;
}) {
  const t = useTranslations("program");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const changed = JSON.stringify(values) !== JSON.stringify(initial);

  return (
    <div>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await updateProgramAction({ ...values, programId });
            if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
            setStatus({ kind: "ok", text: t("settingsSaved") });
            router.refresh();
          });
        }}
      >
        <ProgramFields
          values={values}
          onChange={setValues}
          idPrefix="program-settings"
          today={today}
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ConfirmButton
            label={t("deleteLabel")}
            question={t("deleteQuestion", { name: initial.name })}
            detail={t("deleteDetail")}
            confirmLabel={t("deleteConfirm")}
            cancelLabel={common("cancel")}
            onConfirm={() =>
              startTransition(async () => {
                const result = await deleteProgramAction({ programId });
                if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
                router.push("/");
              })
            }
          />
          <div className="flex flex-wrap items-center gap-4">
            <StatusMessage status={status} />
            <Button type="submit" variant="primary" disabled={pending || !changed}>
              {pending ? common("saving") : t("settingsSave")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
