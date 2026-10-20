"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { formatDateShort } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";
import type { Article } from "@/types";

const statusBadge: Record<string, "default" | "primary" | "success" | "warning"> = {
  draft: "warning",
  published: "success",
  archived: "default",
};

export default function AdminArticlesPage() {
  const { t, locale } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/articles?${params}`);
      const data = await res.json();

      setArticles(data.articles ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(t("adminArticles.deleteConfirm", { title }))) return;

    await fetch(`/api/admin/articles/${id}`, { method: "DELETE" });
    fetchArticles();
  };

  const handlePublish = async (id: number) => {
    await fetch(`/api/admin/articles/${id}/publish`, { method: "POST" });
    fetchArticles();
  };

  const handleArchive = async (id: number) => {
    await fetch(`/api/admin/articles/${id}/archive`, { method: "POST" });
    fetchArticles();
  };

  const columns = [
    {
      key: "title",
      header: "Title",
      className: "max-w-[300px]",
      render: (a: Record<string, unknown>) => (
        <Link
          href={`/admin/articles/${a.id}/edit`}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          {String(a.title || t("adminArticles.untitled"))}
        </Link>
      ),
    },
    {
      key: "status",
      header: t("adminArticles.status"),
      render: (a: Record<string, unknown>) => {
        const s = String(a.status || "draft");
        const labels: Record<string, string> = {
          draft: t("adminArticles.draft"),
          published: t("adminArticles.published"),
          archived: t("adminArticles.archived"),
        };
        return (
          <Badge variant={statusBadge[s] || "default"}>
            {labels[s] || s}
          </Badge>
        );
      },
    },
    {
      key: "categoryName",
      header: t("adminArticles.category"),
      render: (a: Record<string, unknown>) => (
        <span className="text-muted-foreground">
          {String(a.categoryName || "—")}
        </span>
      ),
    },
    {
      key: "viewCount",
      header: t("adminArticles.views"),
      className: "text-center",
      render: (a: Record<string, unknown>) => (
        <span className="text-muted-foreground">{String(a.viewCount ?? 0)}</span>
      ),
    },
    {
      key: "createdAt",
      header: t("adminArticles.date"),
      render: (a: Record<string, unknown>) => (
        <span className="text-muted-foreground">
          {formatDateShort(String(a.createdAt || ""), locale)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("adminArticles.title")}</h1>
        <Link href="/admin/articles/new">
          <Button variant="primary">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("adminArticles.newArticle")}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="search"
          placeholder={t("adminArticles.searchPlaceholder")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t("adminArticles.allStatus")}</option>
          <option value="draft">{t("adminArticles.draft")}</option>
          <option value="published">{t("adminArticles.published")}</option>
          <option value="archived">{t("adminArticles.archived")}</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={articles as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage={t("adminArticles.noArticles")}
          actions={(a: Record<string, unknown>) => {
            const id = Number(a.id);
            const title = String(a.title);
            const articleStatus = String(a.status);
            return (
              <>
                <Link href={`/admin/articles/${id}/edit`}>
                  <Button variant="ghost" size="sm">{t("adminArticles.edit")}</Button>
                </Link>
                {articleStatus === "draft" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePublish(id)}
                  >
                    {t("adminArticles.publish")}
                  </Button>
                )}
                {articleStatus === "published" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(id)}
                  >
                    {t("adminArticles.archive")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(id, title)}
                  className="text-red-500 hover:text-red-600"
                >
                  {t("adminArticles.delete")}
                </Button>
              </>
            );
          }}
        />
      )}

      <div className="mt-6">
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/articles"
          searchParams={
            status ? { status } : search ? { search } : undefined
          }
        />
      </div>
    </div>
  );
}
