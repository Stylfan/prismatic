"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  recoveryCodesAction,
  totpBeginAction,
  totpConfirmAction,
  totpDisableAction,
} from "@/actions/factors";
import { Button, Hint, Input, Label } from "@/components/ui/controls";
import { Panel } from "@/components/ui/layout";
import { StatusMessage, useStatus } from "@/components/ui/status";

type Setup = { token: string; secret: string; qr: string };

/** Two-step sign-in with an authenticator app: turn on, new recovery codes, turn off. */
export function TotpPanel({ enabled, codesLeft }: { enabled: boolean; codesLeft: number }) {
  const t = useTranslations("account.totp");
  const te = useTranslations("account.errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useStatus();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [code, setCode] = useState("");

  const fail = (error: string) => setStatus({ kind: "error", text: te(error) });

  if (codes) {
    return (
      <Panel className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">{t("codesTitle")}</h3>
        <p className="text-sm leading-relaxed text-slate">{t("codesBody")}</p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-[15px] sm:grid-cols-5">
          {codes.map((c) => (
            <li key={c} className="rounded border border-hairline px-2 py-1 text-center">
              {c}
            </li>
          ))}
        </ul>
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCodes(null);
              router.refresh();
            }}
          >
            {t("codesDone")}
          </Button>
        </div>
      </Panel>
    );
  }

  const codeField = (
    <div className="flex max-w-xs flex-col gap-1.5">
      <Label htmlFor="totp-code">{t("codeLabel")}</Label>
      <Input
        id="totp-code"
        autoComplete="one-time-code"
        maxLength={20}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </div>
  );

  if (setup) {
    return (
      <Panel className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold">{t("scanTitle")}</h3>
        <p className="text-sm leading-relaxed text-slate">{t("scanBody")}</p>
        {/* The SVG is drawn on the server by the qrcode package from our own otpauth address. */}
        <div
          className="size-48 rounded border border-hairline bg-white p-2"
          role="img"
          aria-label={t("qrLabel")}
          dangerouslySetInnerHTML={{ __html: setup.qr }}
        />
        <Hint>
          {t("manual")} <code className="font-mono text-ink select-all">{setup.secret}</code>
        </Hint>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const result = await totpConfirmAction({ token: setup.token, code });
              if (!result.ok) return fail(result.error);
              setSetup(null);
              setCode("");
              setCodes(result.data);
            });
          }}
        >
          {codeField}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={pending}>
              {t("confirm")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSetup(null)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
        <StatusMessage status={status} />
      </Panel>
    );
  }

  if (!enabled) {
    return (
      <Panel className="flex flex-col gap-3">
        <p className="text-sm text-slate">{t("off")}</p>
        <div>
          <Button
            variant="primary"
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await totpBeginAction();
                if (!result.ok) return fail(result.error);
                setSetup(result.data);
              })
            }
          >
            {t("enable")}
          </Button>
        </div>
        <StatusMessage status={status} />
      </Panel>
    );
  }

  return (
    <Panel className="flex flex-col gap-4">
      <p className="text-sm font-medium text-success">{t("on", { count: codesLeft })}</p>
      {codeField}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await recoveryCodesAction({ code });
              if (!result.ok) return fail(result.error);
              setCode("");
              setCodes(result.data);
            })
          }
        >
          {t("newCodes")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await totpDisableAction({ code });
              if (!result.ok) return fail(result.error);
              setCode("");
              router.refresh();
            })
          }
        >
          {t("disable")}
        </Button>
      </div>
      <Hint>{t("codeNeeded")}</Hint>
      <StatusMessage status={status} />
    </Panel>
  );
}
