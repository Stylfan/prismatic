"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  addCaseAction,
  addDecisionAction,
  deleteCaseAction,
  deleteDecisionAction,
  updateCaseAction,
  updateDecisionAction,
} from "@/actions/report";
import type { Result } from "@/actions/result";
import { ConfirmButton } from "@/components/ui/confirm";
import { Button, Input, Label, Select, Textarea } from "@/components/ui/controls";
import { StatusMessage, useStatus } from "@/components/ui/status";
import type { CaseStatus, Decision, DecisionCase, DecisionEffect } from "@/db/schema";

const EFFECTS: DecisionEffect[] = ["simplifying", "complicating", "neutral", "pending"];

/** Adds a titled row, for cases and decisions alike. */
function AddTitled({
  programId,
  label,
  placeholder,
  submit,
  action,
}: {
  programId: string;
  label: string;
  placeholder: string;
  submit: string;
  action: (raw: unknown) => Promise<Result<string>>;
}) {
  const errors = useTranslations("errors");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const id = `add-${label.length}-${submit.length}`;
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          const result = await action({ programId, title });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setTitle("");
          router.refresh();
        });
      }}
    >
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-3">
        <Input
          id={id}
          maxLength={200}
          value={title}
          placeholder={placeholder}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !title.trim()}>
          {submit}
        </Button>
      </div>
      <StatusMessage status={status} />
    </form>
  );
}

/** Cases the steering group is asked to decide, each with the four parts the slides use. */
export function CasesEditor({ programId, cases }: { programId: string; cases: DecisionCase[] }) {
  const t = useTranslations("report.cases");
  return (
    <div className="flex flex-col gap-4">
      {cases.map((c) => (
        <CaseForm key={c.id} item={c} />
      ))}
      <AddTitled
        programId={programId}
        label={t("new")}
        placeholder={t("placeholder")}
        submit={t("add")}
        action={addCaseAction}
      />
    </div>
  );
}

function CaseForm({ item }: { item: DecisionCase }) {
  const t = useTranslations("report.cases");
  const tr = useTranslations("report");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({
    title: item.title,
    problem: item.problem,
    background: item.background,
    keyPoints: item.keyPoints,
    nextSteps: item.nextSteps,
    status: item.status,
  });
  const id = (k: string) => `case-${item.id}-${k}`;
  return (
    <form
      className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-hairline bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateCaseAction({ caseId: item.id, ...v });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setStatus({ kind: "ok", text: t("saved") });
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("title")}>
          {t("title")}
        </Label>
        <Input
          quiet
          id={id("title")}
          maxLength={200}
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("status")}>
          {t("status")}
        </Label>
        <Select
          className="h-8 text-[13px]"
          id={id("status")}
          value={v.status}
          onChange={(e) => setV({ ...v, status: e.target.value as CaseStatus })}
        >
          <option value="open">{t("open")}</option>
          <option value="decided">{t("decided")}</option>
        </Select>
      </div>
      {(["problem", "background", "keyPoints", "nextSteps"] as const).map((k) => (
        <div key={k} className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-slate" htmlFor={id(k)}>
            {tr(`case.${k}`)}
          </Label>
          <Textarea
            quiet
            id={id(k)}
            rows={2}
            maxLength={4000}
            value={v[k]}
            onChange={(e) => setV({ ...v, [k]: e.target.value })}
          />
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3">
        {" "}
        <ConfirmButton
          label={t("delete")}
          question={t("deleteQuestion", { title: item.title })}
          confirmLabel={t("delete")}
          cancelLabel={common("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              await deleteCaseAction({ caseId: item.id });
              router.refresh();
            })
          }
        />
        <span className="flex-1" />
        <StatusMessage status={status} />
        <Button type="submit" variant="primary" size="sm" disabled={pending || !v.title.trim()}>
          {common("save")}
        </Button>
      </div>
    </form>
  );
}

/** The decision log: what was decided, when, where, and whether it simplifies or complicates. */
export function DecisionsEditor({
  programId,
  decisions,
}: {
  programId: string;
  decisions: Decision[];
}) {
  const t = useTranslations("report.decisions");
  return (
    <div className="flex flex-col gap-3">
      {decisions.map((d) => (
        <DecisionForm key={d.id} item={d} />
      ))}
      <AddTitled
        programId={programId}
        label={t("new")}
        placeholder={t("placeholder")}
        submit={t("add")}
        action={addDecisionAction}
      />
    </div>
  );
}

function DecisionForm({ item }: { item: Decision }) {
  const t = useTranslations("report.decisions");
  const tr = useTranslations("report");
  const common = useTranslations("common");
  const errors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [v, setV] = useState({
    title: item.title,
    decidedOn: item.decidedOn,
    forum: item.forum,
    decision: item.decision,
    effect: item.effect,
  });
  const id = (k: string) => `decision-${item.id}-${k}`;
  return (
    <form
      className="grid grid-cols-[1fr_9rem_12rem_10rem] gap-x-3 gap-y-3 rounded-lg border border-hairline bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updateDecisionAction({ decisionId: item.id, ...v });
          if (!result.ok) return setStatus({ kind: "error", text: errors(result.error) });
          setStatus({ kind: "ok", text: t("saved") });
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("title")}>
          {tr("decision.title")}
        </Label>
        <Input
          quiet
          id={id("title")}
          maxLength={200}
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("when")}>
          {tr("decision.when")}
        </Label>
        <Input
          quiet
          id={id("when")}
          maxLength={60}
          value={v.decidedOn}
          placeholder={t("whenPlaceholder")}
          onChange={(e) => setV({ ...v, decidedOn: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("forum")}>
          {tr("decision.forum")}
        </Label>
        <Input
          quiet
          id={id("forum")}
          maxLength={120}
          value={v.forum}
          placeholder={t("forumPlaceholder")}
          onChange={(e) => setV({ ...v, forum: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("effect")}>
          {tr("decision.effect")}
        </Label>
        <Select
          className="h-8 text-[13px]"
          id={id("effect")}
          value={v.effect}
          onChange={(e) => setV({ ...v, effect: e.target.value as DecisionEffect })}
        >
          {EFFECTS.map((x) => (
            <option key={x} value={x}>
              {tr(`effects.${x}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="col-span-4 flex flex-col gap-1.5">
        <Label className="text-[12px] text-slate" htmlFor={id("decision")}>
          {tr("decision.decision")}
        </Label>
        <Textarea
          quiet
          id={id("decision")}
          rows={2}
          maxLength={4000}
          value={v.decision}
          onChange={(e) => setV({ ...v, decision: e.target.value })}
        />
      </div>
      <div className="col-span-4 flex items-center gap-3">
        {" "}
        <ConfirmButton
          label={t("delete")}
          question={t("deleteQuestion", { title: item.title })}
          confirmLabel={t("delete")}
          cancelLabel={common("cancel")}
          onConfirm={() =>
            startTransition(async () => {
              await deleteDecisionAction({ decisionId: item.id });
              router.refresh();
            })
          }
        />
        <span className="flex-1" />
        <StatusMessage status={status} />
        <Button type="submit" variant="primary" size="sm" disabled={pending || !v.title.trim()}>
          {common("save")}
        </Button>
      </div>
    </form>
  );
}
