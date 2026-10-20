import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { getTranslation } from "@/i18n/getTranslation";

export default async function LoginPage() {
  const { t } = await getTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Suspense fallback={<div className="text-muted-foreground">{t("common.loading")}</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
