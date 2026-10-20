"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/useTranslation";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string; // e.g., "/articles" or "/admin/articles"
  searchParams?: Record<string, string>;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
}: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  const buildUrl = (p: number) => {
    const params = new URLSearchParams({ ...searchParams, page: String(p) });
    return `${basePath}?${params.toString()}`;
  };

  // Generate page numbers to show
  const pages: (number | "...")[] = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1">
      <Link href={buildUrl(page - 1)}>
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          className="disabled:opacity-50"
        >
          {t("common.previous")}
        </Button>
      </Link>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link key={p} href={buildUrl(p)}>
            <Button
              variant={p === page ? "primary" : "ghost"}
              size="sm"
            >
              {p}
            </Button>
          </Link>
        )
      )}

      <Link href={buildUrl(page + 1)}>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          className="disabled:opacity-50"
        >
          {t("common.next")}
        </Button>
      </Link>
    </nav>
  );
}
