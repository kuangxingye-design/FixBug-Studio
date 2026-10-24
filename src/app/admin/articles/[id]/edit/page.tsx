"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TagSelector } from "@/components/admin/TagSelector";
import { CategorySelector } from "@/components/admin/CategorySelector";
import { VersionHistory } from "@/components/admin/VersionHistory";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { AIChatPanel } from "@/components/admin/AIChatPanel";
import { useTranslation } from "@/i18n/useTranslation";
import type { Article, ArticleVersion } from "@/types";

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
  const { t } = useTranslation();
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; });

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [coverImage, setCoverImage] = useState("");

  // AI chat panel
  const [showAIChat, setShowAIChat] = useState(false);

  // Preview toggle
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "versions">("edit");
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState(0);

  const fetchArticle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/articles/${articleId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      if (data.article) {
        const a = data.article;
        setArticle(a);
        setTitle(a.title);
        setSlug(a.slug);
        setExcerpt(a.excerpt || "");
        setContent(a.content);
        setCategoryName(a.category?.name || "");
        setTagNames(a.tags?.map((t: { name: string }) => t.name) || []);
        setSelectedStatus(a.status);
        setIsFeatured(a.isFeatured);
        setCoverImage(a.coverImage || "");
        setVersions(a.versions || []);
        setCurrentVersion((a.versions || []).length + 1);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
      setError(tRef.current("common.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  const handleSave = async (publish = false) => {
    if (saving) return;
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      let categoryId: number | null = null;
      if (categoryName) {
        const catRes = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
          }),
        });
        const catData = await catRes.json();
        categoryId = catData.category?.id ?? null;
      }

      const tagIds: number[] = [];
      for (const tagName of tagNames) {
        const tagRes = await fetch("/api/admin/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, "-"),
          }),
        });
        if (tagRes.ok) {
          const tagData = await tagRes.json();
          if (tagData.tag?.id) tagIds.push(tagData.tag.id);
        }
      }

      const res = await fetch(`/api/admin/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || undefined,
          excerpt,
          content,
          categoryId,
          tagIds,
          status: publish ? "published" : selectedStatus,
          isFeatured,
          coverImage,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("errors.saveFailed"));
      }

      await fetchArticle();
      setSaveMessage(t("common.saved"));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("errors.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (version: ArticleVersion) => {
    if (!confirm(t("versionHistory.restoreConfirm"))) return;

    setTitle(version.title);
    setContent(version.content);
    setExcerpt(version.excerpt || "");

    await handleSave(false);
    setActiveTab("edit");
  };

  const handleDelete = async () => {
    if (!confirm(t("adminArticles.deleteArticleConfirm"))) return;

    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/articles/${articleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("errors.saveFailed"));
      router.push("/admin/articles");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t("errors.saveFailed")
      );
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  if (error && !article) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchArticle}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("adminArticles.articleNotFound")}
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    draft: t("adminArticles.draft"),
    published: t("adminArticles.published"),
    archived: t("adminArticles.archived"),
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("adminArticles.editArticle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminArticles.lastUpdated")}: {article.updatedAt}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? t("adminArticles.saving") : t("adminArticles.saveDraft")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? t("adminArticles.publishing") : t("adminArticles.publish")}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {saveMessage}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Status bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant={article.status === "published" ? "success" : article.status === "draft" ? "warning" : "default"}>
          {statusLabels[article.status] || article.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {t("articles.views", { count: article.viewCount })}
        </span>
        {article.publishedAt && (
          <span className="text-sm text-muted-foreground">
            {t("adminArticles.publishedAt")}: {article.publishedAt}
          </span>
        )}
        <a
          href={`/articles/${article.slug}`}
          target="_blank"
          className="text-sm text-primary hover:underline"
        >
          {t("adminArticles.viewOnSite")}
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editor area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs + AI button */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1 rounded-lg bg-muted p-1">
              {(["edit", "preview", "versions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "edit" ? t("adminArticles.editor") : tab === "preview" ? t("adminArticles.preview") : t("adminArticles.versions")}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="shrink-0 gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI 助手
            </Button>
          </div>

          {activeTab === "edit" && (
            <div className="space-y-4">
              <Input
                placeholder={t("adminArticles.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("adminArticles.contentPlaceholder")}
                rows={25}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          )}

          {activeTab === "preview" && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h1 className="mb-4 text-2xl font-bold">{title || t("adminArticles.untitled")}</h1>
              <MarkdownRenderer content={content} />
            </div>
          )}

          {activeTab === "versions" && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 font-semibold">{t("adminArticles.versions")}</h3>
              <VersionHistory
                versions={versions}
                currentVersion={currentVersion}
                onRestore={handleRestoreVersion}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">{t("adminArticles.articleSettings")}</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.slug")}</label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t("adminArticles.slugPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.excerpt")}</label>
                <Textarea
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder={t("adminArticles.excerptPlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.categoryLabel")}</label>
                <CategorySelector
                  value={categoryName}
                  onChange={setCategoryName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.tagsLabel")}</label>
                <TagSelector
                  selected={tagNames}
                  onChange={setTagNames}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.statusLabel")}</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="draft">{t("adminArticles.draft")}</option>
                  <option value="published">{t("adminArticles.published")}</option>
                  <option value="archived">{t("adminArticles.archived")}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="featured" className="text-sm">{t("adminArticles.featuredArticle")}</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("adminArticles.coverImageUrl")}</label>
                <Input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder={t("adminArticles.coverImagePlaceholder")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-red-200">
            <CardHeader>
              <h3 className="font-semibold text-red-600">{t("adminArticles.dangerZone")}</h3>
            </CardHeader>
            <CardContent>
              <Button
                variant="danger"
                size="sm"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? t("common.loading") : t("adminArticles.deleteArticle")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel
        content={content}
        onApply={(newContent) => setContent(newContent)}
        open={showAIChat}
        onClose={() => setShowAIChat(false)}
      />
    </div>
  );
}
