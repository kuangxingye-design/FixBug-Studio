import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.tags") };
}

async function getTags() {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/tags`, { cache: "no-store" });
    const data = await res.json();
    return data.tags || [];
  } catch {
    return [];
  }
}

export default async function TagsPage() {
  const allTags = await getTags();
  const { t } = await getTranslation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">{t("tags.title")}</h1>
      {allTags.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {allTags.map((tag: Record<string, unknown>) => (
            <Link key={String(tag.id)} href={`/tags/${tag.slug}`}>
              <Badge variant="default" className="px-4 py-2 text-sm">
                {String(tag.name)} ({String(tag.articleCount || 0)})
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-muted-foreground">{t("tags.noTags")}</p>
      )}
    </div>
  );
}
