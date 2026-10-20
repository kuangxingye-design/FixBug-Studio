"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/admin/DataTable";
import { useTranslation } from "@/i18n/useTranslation";
import type { Tag } from "@/types";

export default function TagsPage() {
  const { t } = useTranslation();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/admin/tags");
    const data = await res.json();
    setTags(data.tags ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchTags();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t("adminTags.deleteConfirm", { name }))) return;
    await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    fetchTags();
  };

  const columns = [
    { key: "name", header: t("adminTags.name"), render: (t: Record<string, unknown>) => <span className="font-medium">{String(t.name)}</span> },
    { key: "slug", header: t("adminTags.slug"), render: (t: Record<string, unknown>) => <span className="text-muted-foreground font-mono text-xs">{String(t.slug)}</span> },
    { key: "articleCount", header: t("adminTags.articles"), render: (t: Record<string, unknown>) => <span>{String(t.articleCount ?? 0)}</span> },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("adminTags.title")}</h1>
      </div>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <Input
          placeholder={t("adminTags.newTagPlaceholder")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="primary">{t("adminTags.addTag")}</Button>
      </form>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={tags as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage={t("adminTags.noTags")}
          actions={(tagRow: Record<string, unknown>) => (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(Number(tagRow.id), String(tagRow.name))} className="text-red-500">{t("common.delete")}</Button>
          )}
        />
      )}
    </div>
  );
}
