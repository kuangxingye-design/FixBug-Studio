import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { TableOfContents } from "@/components/articles/TableOfContents";
import { Badge } from "@/components/ui/Badge";
import { CommentSection } from "@/components/comments/CommentSection";
import { extractTOC } from "@/lib/markdown/toc";
import { formatDate } from "@/lib/utils/date";
import { getTranslation } from "@/i18n/getTranslation";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getTranslation();
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${apiUrl}/api/articles/${slug}`, { cache: "no-store" });
    const data = await res.json();
    const article = data.article;

    if (!article) return { title: t("metadata.notFound") };

    return {
      title: article.title,
      description: article.excerpt || undefined,
      openGraph: {
        title: article.title,
        description: article.excerpt || undefined,
        type: "article",
        publishedTime: article.publishedAt,
        images: article.coverImage ? [article.coverImage] : [],
      },
    };
  } catch {
    return { title: t("metadata.article") };
  }
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const { t, locale } = await getTranslation();
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let data: { article: Record<string, unknown> | null; error?: string };
  try {
    const res = await fetch(`${apiUrl}/api/articles/${slug}`, { cache: "no-store" });
    data = await res.json();
  } catch {
    data = { article: null, error: "Failed to fetch" };
  }

  if (!data?.article) {
    notFound();
  }

  const article = data.article as Record<string, unknown>;
  const toc = extractTOC(String(article.content || ""));
  const tags = (article.tags as { id: number; name: string; slug: string }[]) || [];
  const prevArticle = article.prevArticle as { title: string; slug: string } | null;
  const nextArticle = article.nextArticle as { title: string; slug: string } | null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_250px]">
        {/* Main content */}
        <article>
          {/* Header */}
          <header className="mb-8">
            {String(article.categoryName || "") && String(article.categorySlug || "") && (
              <Link
                href={`/categories/${String(article.categorySlug)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {String(article.categoryName)}
              </Link>
            )}
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              {String(article.title)}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {String(article.publishedAt || "") && (
                <time dateTime={String(article.publishedAt)}>
                  {formatDate(String(article.publishedAt), locale)}
                </time>
              )}
              {article.readingTime ? (
                <span>{t("articles.minRead", { count: Number(article.readingTime) })}</span>
              ) : null}
              <span>{t("articles.views", { count: Number(article.viewCount || 0) })}</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Link key={tag.id} href={`/tags/${tag.slug}`}>
                    <Badge variant="default">{tag.name}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="pb-8">
            <MarkdownRenderer content={String(article.content)} />
          </div>

          {/* Navigation */}
          <nav className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6">
            {prevArticle ? (
              <Link
                href={`/articles/${prevArticle.slug}`}
                className="group rounded-lg border border-border p-4 transition-colors hover:bg-accent"
              >
                <span className="text-xs text-muted-foreground">{t("articles.previousArticle")}</span>
                <p className="mt-1 text-sm font-medium group-hover:text-primary">
                  {prevArticle.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
            {nextArticle ? (
              <Link
                href={`/articles/${nextArticle.slug}`}
                className="group rounded-lg border border-border p-4 text-right transition-colors hover:bg-accent"
              >
                <span className="text-xs text-muted-foreground">{t("articles.nextArticle")}</span>
                <p className="mt-1 text-sm font-medium group-hover:text-primary">
                  {nextArticle.title}
                </p>
              </Link>
            ) : (
              <div />
            )}
          </nav>

          {/* Comments */}
          <CommentSection articleSlug={slug} />
        </article>

        {/* Sidebar TOC */}
        <aside className="hidden lg:block">
          <TableOfContents items={toc} />
        </aside>
      </div>
    </div>
  );
}
