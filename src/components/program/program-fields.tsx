"use client";

import { useTranslations } from "next-intl";
import { Input, Textarea } from "@/components/ui/controls";
import { HintIcon } from "@/components/ui/hint-icon";
import { SettingRow } from "@/components/ui/layout";
import { Segmented } from "@/components/ui/segmented";
import type { PeriodModel } from "@/db/schema";
import { RoadmapLength } from "./roadmap-length";

export type ProgramValues = {
  name: string;
  goal: string;
  periodModel: PeriodModel;
  startDate: string;
  roadmapYears: number;
  costPerQuarter: number | null;
  deviationPct: number;
};

/** A group of settings under its own heading, the way the settings page is read. */
function Group({
  title,
  tip,
  children,
}: {
  title: string;
  tip?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
        {title}
        {tip && <HintIcon text={tip} />}
      </h3>
      <div className="rounded-lg border border-hairline bg-surface px-5">{children}</div>
    </section>
  );
}

/**
 * A programme's fields, shared by the create form and the settings page,
 * in three groups: the programme itself, its periods and how far the
 * roadmap reaches, and its economy and tolerance. Help sits behind the
 * question marks, for those who need it.
 */
export function ProgramFields({
  values,
  onChange,
  idPrefix,
  today,
}: {
  values: ProgramValues;
  onChange: (next: ProgramValues) => void;
  idPrefix: string;
  today: string;
}) {
  const t = useTranslations("fields");
  const set = <K extends keyof ProgramValues>(key: K, value: ProgramValues[K]) =>
    onChange({ ...values, [key]: value });
  const id = (name: string) => `${idPrefix}-${name}`;
  const whole = (raw: string) => (raw === "" ? null : Math.max(0, Math.round(Number(raw))));

  return (
    <div className="flex flex-col gap-6">
      <Group title={t("groupProgram")}>
        <SettingRow label={t("name")} htmlFor={id("name")}>
          <Input
            id={id("name")}
            required
            maxLength={80}
            value={values.name}
            placeholder={t("namePlaceholder")}
            onChange={(e) => set("name", e.target.value)}
          />
        </SettingRow>
        <SettingRow label={t("goal")} htmlFor={id("goal")}>
          <Textarea
            id={id("goal")}
            rows={2}
            maxLength={300}
            value={values.goal}
            placeholder={t("goalPlaceholder")}
            onChange={(e) => set("goal", e.target.value)}
          />
        </SettingRow>
      </Group>

      <Group title={t("groupPeriods")} tip={t("groupPeriodsTip")}>
        <SettingRow label={t("periodModel")}>
          <Segmented<PeriodModel>
            name={id("model")}
            label={t("periodModel")}
            value={values.periodModel}
            options={[
              { value: "seasons", label: t("seasons") },
              { value: "calendar", label: t("calendar") },
            ]}
            onChange={(m) => set("periodModel", m)}
          />
        </SettingRow>
        <SettingRow
          label={
            <span className="flex items-center gap-1.5">
              {t("startDate")}
              <HintIcon text={t("startHint")} />
            </span>
          }
          htmlFor={id("start")}
        >
          <Input
            id={id("start")}
            type="date"
            required
            value={values.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="w-44"
          />
        </SettingRow>
        <SettingRow
          label={
            <span className="flex items-center gap-1.5">
              {t("roadmapLength")}
              <HintIcon text={t("roadmapLengthTip")} />
            </span>
          }
        >
          <RoadmapLength
            model={values.periodModel}
            startDate={values.startDate}
            today={today}
            years={values.roadmapYears}
            onChange={(y) => set("roadmapYears", y)}
          />
        </SettingRow>
      </Group>

      <Group title={t("groupEconomy")}>
        <SettingRow
          label={
            <span className="flex items-center gap-1.5">
              {t("costPerQuarter")}
              <HintIcon text={t("costHint")} />
            </span>
          }
          htmlFor={id("cost")}
        >
          <Input
            id={id("cost")}
            type="number"
            min={0}
            step={1000}
            className="tabular w-44"
            value={values.costPerQuarter ?? ""}
            onChange={(e) => set("costPerQuarter", whole(e.target.value))}
          />
        </SettingRow>
        <SettingRow
          label={
            <span className="flex items-center gap-1.5">
              {t("deviationPct")}
              <HintIcon text={t("deviationHint")} />
            </span>
          }
          htmlFor={id("deviation")}
        >
          <Input
            id={id("deviation")}
            type="number"
            min={1}
            max={100}
            required
            className="tabular w-24"
            value={values.deviationPct}
            onChange={(e) =>
              set("deviationPct", Math.min(100, Math.max(1, whole(e.target.value) ?? 10)))
            }
          />
        </SettingRow>
      </Group>
    </div>
  );
}
