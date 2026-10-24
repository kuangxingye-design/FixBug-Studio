"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/admin/UploadZone";
import { ProcessingStatus } from "@/components/admin/ProcessingStatus";
import { AIPreviewPanel } from "@/components/admin/AIPreviewPanel";
import { AIChatPanel } from "@/components/admin/AIChatPanel";
import { Button } from "@/components/ui/Button";
import { useAIStream } from "@/hooks/useAIStream";
import { useTranslation } from "@/i18n/useTranslation";
import {
  extractRewritableImageKeys,
  imageKey,
  rewriteImageSrcs,
} from "@/lib/markdown/images";
import type { AIProcessResponse } from "@/lib/ai/types";

/**
 * Upload the images that came in with the .md to the media library.
 * Returns a map of `imageKey(fileName)` → served URL for every success, plus the names
 * of the files that failed so the caller can tell the user which references stay broken.
 */
async function uploadImages(
  images: File[]
): Promise<{ mapping: Map<string, string>; failed: string[] }> {
  const results = await Promise.all(
    images.map(async (image) => {
      const formData = new FormData();
      formData.append("file", image);
      try {
        const res = await fetch("/api/admin/media", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) return { image, url: null };
        const data = await res.json();
        return { image, url: (data.media?.url as string) ?? null };
      } catch {
        return { image, url: null };
      }
    })
  );

  const mapping = new Map<string, string>();
  const failed: string[] = [];

  for (const { image, url } of results) {
    const key = imageKey(image.name);
    if (!url) {
      failed.push(image.name);
      continue;
    }
    // Same basename twice — the first upload wins, matching rewriteImageSrcs.
    if (!mapping.has(key)) mapping.set(key, url);
  }

  return { mapping, failed };
}

export default function NewArticlePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [rawContent, setRawContent] = useState("");
  const [sourceContent, setSourceContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [suggestions, setSuggestions] = useState<AIProcessResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [imageNotice, setImageNotice] = useState("");
  const [showAIChat, setShowAIChat] = useState(false);

  const { status, progressStep, progressMessage, error, startStream, reset } =
    useAIStream({
      onComplete: (result) => {
        setSuggestions(result as AIProcessResponse);
      },
    });

  const handleFiles = useCallback(
    async (file: File, images: File[]) => {
      setFileName(file.name);
      setRawContent("");
      setSourceContent("");
      setSuggestions(null);
      setSaveError("");
      setImageNotice("");

      // Read file content for raw display
      const original = await file.text();
      setRawContent(original);

      // Upload the images that shipped with the .md and repoint the markdown at them,
      // so the AI (and the saved article) reference served URLs instead of local paths.
      let mapping = new Map<string, string>();
      let failed: string[] = [];
      if (images.length > 0) {
        ({ mapping, failed } = await uploadImages(images));
      }
      const contentForAI = rewriteImageSrcs(original, mapping);
      setSourceContent(contentForAI);

      // Report what happened, including images the document references that were never
      // dropped — otherwise those render as silent broken images.
      const failedKeys = new Set(failed.map(imageKey));
      const missing = extractRewritableImageKeys(original).filter(
        (key) => !mapping.has(key) && !failedKeys.has(key)
      );

      const notices: string[] = [];
      if (mapping.size > 0) {
        notices.push(t("adminArticles.imagesUploaded", { count: mapping.size }));
      }
      if (failed.length > 0) {
        notices.push(t("adminArticles.imagesFailed", { names: failed.join(", ") }));
      }
      if (missing.length > 0) {
        notices.push(t("adminArticles.imagesMissing", { names: missing.join(", ") }));
      }
      setImageNotice(notices.join(" "));

      // Send to AI
      const formData = new FormData();
      formData.append(
        "file",
        new File([contentForAI], file.name, { type: "text/markdown" })
      );
      await startStream("/api/ai/process", formData);
    },
    [startStream, t]
  );

  const handleSave = async (publish: boolean) => {
    if (!suggestions || saving) return;

    setSaving(true);
    setSaveError("");

    try {
      // Find or create category
      let categoryId: number | null = null;
      if (suggestions.suggestedCategory) {
        // First, try to find an existing category by name
        const listRes = await fetch("/api/admin/categories");
        if (listRes.ok) {
          const listData = await listRes.json();
          const existing = (listData.categories || []).find(
            (c: { name: string }) =>
              c.name.toLowerCase() === suggestions.suggestedCategory!.toLowerCase()
          );
          if (existing) {
            categoryId = existing.id;
          }
        }

        // If not found, create a new one
        if (categoryId === null) {
          const catRes = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: suggestions.suggestedCategory }),
          });
          if (catRes.ok) {
            const catData = await catRes.json();
            categoryId = catData.category?.id ?? null;
          }
        }
      }

      // Create tags if needed
      let tagIds: number[] = [];
      for (const tagName of suggestions.suggestedTags) {
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

      // Create article
      const articleRes = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: suggestions.suggestedTitle,
          excerpt: suggestions.suggestedExcerpt,
          content: suggestions.processedContent,
          rawContent: rawContent,
          status: publish ? "published" : "draft",
          categoryId,
          tagIds,
          aiMetadata: suggestions,
        }),
      });

      if (!articleRes.ok) {
        const err = await articleRes.json();
        throw new Error(err.error || t("errors.saveFailed"));
      }

      const articleData = await articleRes.json();
      router.push(`/admin/articles/${articleData.article.id}/edit`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : t("errors.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    reset();
    setRawContent("");
    setSourceContent("");
    setFileName("");
    setSuggestions(null);
    setSaveError("");
    setImageNotice("");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("adminArticles.newArticle")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("adminArticles.uploadDescription")}
          </p>
        </div>
        {suggestions && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              {t("common.cancel")}
            </Button>
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
        )}
      </div>

      {saveError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
          {saveError}
        </div>
      )}

      {imageNotice && (
        <div className="mb-4 rounded-lg bg-accent p-3 text-sm text-muted-foreground">
          {imageNotice}
        </div>
      )}

      {/* Step 1: Upload */}
      {status === "idle" && (
        <UploadZone onFiles={handleFiles} />
      )}

      {/* Step 2: Processing */}
      {(status === "uploading" || status === "processing") && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("adminArticles.processing", { fileName })}
            </p>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t("common.cancel")}
            </Button>
          </div>
          <ProcessingStatus
            step={progressStep}
            message={progressMessage}
            status={status}
          />
        </div>
      )}

      {/* Step 3: Error */}
      {status === "error" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/30">
            <p className="font-medium text-red-600 dark:text-red-400">
              {t("adminArticles.processingFailed")}
            </p>
            <p className="mt-1 text-sm text-red-500">{error}</p>
            <div className="mt-4 flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={handleReset}>
                {t("adminArticles.tryAgain")}
              </Button>
              {(sourceContent || rawContent) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    // Fallback: skip AI and use the manuscript as-is. Prefer the version
                    // with image paths already repointed at the media library.
                    const content = sourceContent || rawContent;
                    setSuggestions({
                      processedContent: content,
                      suggestedTitle: fileName.replace(/\.md$/, ""),
                      suggestedTags: ["untagged"],
                      suggestedCategory: "Notes",
                      suggestedExcerpt: content.substring(0, 200),
                      estimatedReadingTime: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)),
                    });
                  }}
                >
                  {t("adminArticles.useRawContent")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Preview (complete) */}
      {status === "complete" && suggestions && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("adminArticles.aiSuggestions")}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="gap-1.5"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              AI 调整
            </Button>
          </div>
          <AIPreviewPanel
            rawContent={rawContent}
            result={suggestions}
            onEditSuggestion={setSuggestions}
          />
          <AIChatPanel
            content={suggestions.processedContent}
            onApply={(newContent) =>
              setSuggestions({ ...suggestions, processedContent: newContent })
            }
            open={showAIChat}
            onClose={() => setShowAIChat(false)}
          />
        </>
      )}
    </div>
  );
}
