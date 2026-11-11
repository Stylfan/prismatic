"use client";

import { useTranslations } from "next-intl";
import { Input, Select, Textarea } from "@/components/ui/controls";
import { SettingRow } from "@/components/ui/layout";
import type { PeriodModel } from "@/db/schema";
import { ColumnsPreview } from "./columns-preview";

export type ProgramValues = {
  name: string;
  goal: string;
  periodModel: PeriodModel;
  startDate: string;
  quarterHorizon: number;
  costPerQuarter: number | null;
  deviationPct: number;
};

const MODELS: PeriodModel[] = ["seasons", "calendar"];
const HORIZONS = [1, 2, 3, 4];

/**
 * A programme's fields, shared by the create form and the settings panel,
 * one setting per row. The period choices are followed by a live preview of
 * the columns they produce, so the effect is visible before it is saved.
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
    <div className="flex flex-col">
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
      <SettingRow label={t("periodModel")} htmlFor={id("model")}>
        <Select
          id={id("model")}
          value={values.periodModel}
          onChange={(e) => set("periodModel", e.target.value as PeriodModel)}
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m === "calendar" ? t("calendar") : t("seasons")}
            </option>
          ))}
        </Select>
      </SettingRow>
      <SettingRow label={t("startDate")} hint={t("startHint")} htmlFor={id("start")}>
        <Input
          id={id("start")}
          type="date"
          required
          value={values.startDate}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </SettingRow>
      <SettingRow
        label={t("quarterHorizon")}
        hint={t("quarterHorizonHint")}
        htmlFor={id("horizon")}
      >
        <Select
          id={id("horizon")}
          value={String(values.quarterHorizon)}
          onChange={(e) => set("quarterHorizon", Number(e.target.value))}
        >
          {HORIZONS.map((n) => (
            <option key={n} value={n}>
              {t("quarterCount", { count: n })}
            </option>
          ))}
        </Select>
      </SettingRow>
      <div className="border-b border-hairline-soft py-4">
        <ColumnsPreview
          model={values.periodModel}
          startDate={values.startDate}
          quarterHorizon={values.quarterHorizon}
          today={today}
        />
      </div>
      <SettingRow label={t("costPerQuarter")} hint={t("costHint")} htmlFor={id("cost")}>
        <Input
          id={id("cost")}
          type="number"
          min={0}
          step={1000}
          className="tabular"
          value={values.costPerQuarter ?? ""}
          onChange={(e) => set("costPerQuarter", whole(e.target.value))}
        />
      </SettingRow>
      <SettingRow label={t("deviationPct")} hint={t("deviationHint")} htmlFor={id("deviation")}>
        <Input
          id={id("deviation")}
          type="number"
          min={1}
          max={100}
          required
          className="tabular"
          value={values.deviationPct}
          onChange={(e) =>
            set("deviationPct", Math.min(100, Math.max(1, whole(e.target.value) ?? 10)))
          }
        />
      </SettingRow>
    </div>
  );
}
