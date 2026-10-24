"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/useTranslation";

interface PaginationProps {
  page: number;
  totalPages: number;
  basePath: string; // e.g., "/articles" or "/admin/articles"
  searchParams?: Record<string, string>;
  /** When provided, the component renders buttons instead of links and calls this. */
  onPageChange?: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams = {},
  onPageChange,
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

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  const pageButton = (p: number) =>
    onPageChange ? (
      <Button
        variant={p === page ? "primary" : "ghost"}
        size="sm"
        onClick={() => onPageChange(p)}
      >
        {p}
      </Button>
    ) : (
      <Link key={p} href={buildUrl(p)}>
        <Button variant={p === page ? "primary" : "ghost"} size="sm">
          {p}
        </Button>
      </Link>
    );

  const navButton = (
    disabled: boolean,
    target: number,
    label: string
  ) => {
    if (disabled) {
      return (
        <Button variant="outline" size="sm" disabled className="disabled:opacity-50">
          {label}
        </Button>
      );
    }
    if (onPageChange) {
      return (
        <Button variant="outline" size="sm" onClick={() => onPageChange(target)}>
          {label}
        </Button>
      );
    }
    return (
      <Link href={buildUrl(target)}>
        <Button variant="outline" size="sm">{label}</Button>
      </Link>
    );
  };

  return (
    <nav className="flex items-center justify-center gap-1">
      {navButton(prevDisabled, page - 1, t("common.previous"))}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <span key={p}>{pageButton(p)}</span>
        )
      )}

      {navButton(nextDisabled, page + 1, t("common.next"))}
    </nav>
  );
}
