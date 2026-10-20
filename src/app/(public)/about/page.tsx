import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslation();
  return { title: t("metadata.about") };
}

async function getAboutContent() {
  try {
    const res = await fetch("http://localhost:3000/api/settings/public", { cache: "no-store" });
    const data = await res.json();
    return data.settings?.about_content || "# About Me\n\nWelcome to my blog!";
  } catch {
    return "# About Me\n\nWelcome to my blog!";
  }
}

export default async function AboutPage() {
  const content = await getAboutContent();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <MarkdownRenderer content={content} />
      </div>
    </div>
  );
}
