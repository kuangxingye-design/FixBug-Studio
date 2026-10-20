"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/admin/DataTable";
import { useTranslation } from "@/i18n/useTranslation";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2563eb");

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setColor("#2563eb");
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { name, slug: slug || undefined, description: description || undefined, color };
    const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    resetForm();
    fetchCategories();
  };

  const handleEdit = (cat: Category) => {
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setColor(cat.color || "#2563eb");
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t("adminCategories.deleteConfirm", { name }))) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    fetchCategories();
  };

  const columns = [
    {
      key: "name",
      header: t("adminCategories.name"),
      render: (c: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: String(c.color || "#ccc") }} />
          <span className="font-medium">{String(c.name)}</span>
        </div>
      ),
    },
    { key: "slug", header: t("adminCategories.slug"), render: (c: Record<string, unknown>) => <span className="text-muted-foreground font-mono text-xs">{String(c.slug)}</span> },
    { key: "description", header: t("adminCategories.description"), render: (c: Record<string, unknown>) => <span className="text-muted-foreground text-sm">{String(c.description || "—")}</span> },
    { key: "articleCount", header: t("adminCategories.articles"), render: (c: Record<string, unknown>) => <span>{String(c.articleCount ?? 0)}</span> },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("adminCategories.title")}</h1>
        <Button variant="primary" onClick={() => { resetForm(); setShowForm(true); }}>
          {t("adminCategories.addCategory")}
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="font-semibold">{editingId ? t("adminCategories.editCategory") : t("adminCategories.newCategory")}</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-wrap gap-3">
              <Input placeholder={t("adminCategories.name")} value={name} onChange={(e) => setName(e.target.value)} className="max-w-[200px]" required />
              <Input placeholder={t("adminCategories.slugAuto")} value={slug} onChange={(e) => setSlug(e.target.value)} className="max-w-[200px]" />
              <Input placeholder={t("adminCategories.description")} value={description} onChange={(e) => setDescription(e.target.value)} className="max-w-[300px]" />
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 h-10 p-1" />
              <Button type="submit" variant="primary">{editingId ? t("adminCategories.update") : t("adminCategories.create")}</Button>
              <Button type="button" variant="ghost" onClick={resetForm}>{t("common.cancel")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : (
        <DataTable
          columns={columns}
          data={categories as unknown as Record<string, unknown>[]}
          keyField="id"
          emptyMessage={t("adminCategories.noCategories")}
          actions={(c: Record<string, unknown>) => (
            <>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(c as unknown as Category)}>{t("common.edit")}</Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(Number(c.id), String(c.name))} className="text-red-500">{t("common.delete")}</Button>
            </>
          )}
        />
      )}
    </div>
  );
}
