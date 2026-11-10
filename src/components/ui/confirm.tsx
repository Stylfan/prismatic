"use client";

import { useRef } from "react";
import { Button } from "./controls";

/**
 * Nothing destructive happens on one click. A native dialog: it traps
 * focus, closes on Escape and is read out as a dialog by screen readers,
 * and it says in words what will be lost.
 */
export function ConfirmButton({
  label,
  question,
  detail,
  confirmLabel,
  cancelLabel,
  onConfirm,
}: {
  label: string;
  question: string;
  detail?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => ref.current?.showModal()}>
        {label}
      </Button>
      <dialog
        ref={ref}
        className="m-auto max-w-md rounded-lg border border-hairline bg-surface p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 className="text-lg font-semibold">{question}</h2>
        {detail && <p className="mt-2 text-sm leading-relaxed text-slate">{detail}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => ref.current?.close()} autoFocus>
            {cancelLabel}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              ref.current?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
