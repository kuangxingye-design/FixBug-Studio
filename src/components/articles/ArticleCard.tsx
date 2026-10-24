"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateShort } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";

interface ArticleCardProps {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  readingTime: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  tags?: { id: number; name: string; slug: string }[];
}

export function ArticleCard({
  title,
  slug,
  excerpt,
  coverImage,
  categoryName,
  categorySlug,
  readingTime,
  viewCount,
  publishedAt,
  tags,
}: ArticleCardProps) {
  const router = useRouter();
  const { t, locale } = useTranslation();

  return (
    <Card
      hover
      role="link"
      tabIndex={0}
      aria-label={title}
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      onClick={() => router.push(`/articles/${slug}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/articles/${slug}`);
        }
      }}
    >
      {coverImage && (
        <img
          src={coverImage}
          alt={title}
          className="h-48 w-full object-cover"
          loading="lazy"
        />
      )}
      <CardContent className={coverImage ? "pt-4" : "pt-6"}>
        <div className="flex items-center gap-2 mb-2">
          {categoryName && categorySlug && (
            <Link
              href={`/categories/${categorySlug}`}
              className="text-xs font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {categoryName}
            </Link>
          )}
          {publishedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDateShort(publishedAt, locale)}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold leading-snug mb-2 line-clamp-2 text-foreground">
          {title}
        </h3>
        {excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {readingTime && <span>{t("articles.minRead", { count: readingTime })}</span>}
          <span>{t("articles.views", { count: viewCount || 0 })}</span>
          {tags && tags.length > 0 && (
            <div className="flex gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag.id} variant="default">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
