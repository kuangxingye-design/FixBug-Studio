"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/admin/DataTable";
import { formatRelativeTime } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";

const statusBadge: Record<string, "default" | "primary" | "success" | "warning"> = {
  pending: "warning",
  approved: "success",
  rejected: "default",
};

export default function CommentsModerationPage() {
  const { t, locale } = useTranslation();
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const statusLabels: Record<string, string> = {
    pending: t("adminComments.pending"),
    approved: t("adminComments.approved"),
    rejected: t("adminComments.rejected"),
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comments?limit=50");
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleApprove = async (id: number) => {
    await fetch(`/api/admin/comments/${id}/approve`, { method: "POST" });
    fetchComments();
  };

  const handleReject = async (id: number) => {
    await fetch(`/api/admin/comments/${id}/reject`, { method: "POST" });
    fetchComments();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("adminComments.deleteConfirm"))) return;
    await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    fetchComments();
  };

  const columns = [
    {
      key: "authorName",
      header: t("adminComments.author"),
      render: (c: Record<string, unknown>) => (
        <div>
          <p className="font-medium text-sm">{String(c.authorName || t("adminComments.anonymous"))}</p>
          {c.authorEmail ? <p className="text-xs text-muted-foreground">{String(c.authorEmail)}</p> : null}
        </div>
      ),
    },
    {
      key: "content",
      header: t("adminComments.comment"),
      render: (c: Record<string, unknown>) => (
        <div className="max-w-[300px]">
          <p className="text-sm line-clamp-2">{String(c.content)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("adminComments.on")} <span className="font-medium text-foreground">{String(c.articleTitle || t("adminComments.unknown"))}</span>
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: t("adminComments.status"),
      render: (c: Record<string, unknown>) => {
        const s = String(c.status || "pending");
        return <Badge variant={statusBadge[s] || "default"}>{statusLabels[s] || s}</Badge>;
      },
    },
    {
      key: "createdAt",
      header: t("adminComments.date"),
      render: (c: Record<string, unknown>) => (
        <span className="text-xs text-muted-foreground">{formatRelativeTime(String(c.createdAt || ""), locale)}</span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("adminComments.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("adminComments.description")}</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={comments}
          keyField="id"
          emptyMessage={t("adminComments.noComments")}
          actions={(c: Record<string, unknown>) => {
            const id = Number(c.id);
            const commentStatus = String(c.status);
            return (
              <>
                {commentStatus === "pending" && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleApprove(id)} className="text-green-600">{t("adminComments.approve")}</Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReject(id)} className="text-yellow-600">{t("adminComments.reject")}</Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDelete(id)} className="text-red-500">{t("adminComments.delete")}</Button>
              </>
            );
          }}
        />
      )}
    </div>
  );
}
