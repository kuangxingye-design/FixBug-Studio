"use client";

import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/useTranslation";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-2xl font-bold">{t("errors.somethingWentWrong")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("errors.unexpectedError")}
      </p>
      <Button variant="primary" onClick={reset} className="mt-6">
        {t("errors.tryAgain")}
      </Button>
    </div>
  );
}
