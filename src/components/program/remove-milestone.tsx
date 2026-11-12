"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeMilestoneAction } from "@/actions/programs";
import { ConfirmButton } from "@/components/ui/confirm";

/** A small bin that deletes a milestone after one question; its goals stay, without a milestone. */
export function RemoveMilestone({ milestoneId, name }: { milestoneId: string; name: string }) {
  const t = useTranslations("milestones");
  const common = useTranslations("common");
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <ConfirmButton
      icon
      label={t("removeNamed", { name })}
      question={t("removeNamed", { name })}
      detail={t("removeNamedDetail")}
      confirmLabel={t("removeConfirm")}
      cancelLabel={common("cancel")}
      onConfirm={() =>
        startTransition(async () => {
          await removeMilestoneAction({ milestoneId });
          router.refresh();
        })
      }
    />
  );
}
