"use client";

import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/useTranslation";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold text-red-600">{t("errors.somethingWentWrong")}</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
      <Button variant="primary" onClick={reset} className="mt-6">
        {t("errors.tryAgain")}
      </Button>
    </div>
  );
}
