import Link from "next/link";
import { getTranslation } from "@/i18n/getTranslation";

export default async function PublicNotFound() {
  const { t } = await getTranslation();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        {t("errors.pageNotFound")}
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        {t("errors.goHome")}
      </Link>
    </div>
  );
}
