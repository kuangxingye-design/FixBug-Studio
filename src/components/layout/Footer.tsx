import Link from "next/link";
import { getTranslation } from "@/i18n/getTranslation";

export async function Footer() {
  const { t } = await getTranslation();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("common.allRightsReserved", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4">
            <Link href="/rss.xml" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("common.rssFeed")}
            </Link>
            <Link href="/sitemap.xml" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("common.sitemap")}
            </Link>
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("common.admin")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
