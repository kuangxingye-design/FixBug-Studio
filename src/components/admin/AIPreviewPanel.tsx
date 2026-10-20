"use client";

import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { useTranslation } from "@/i18n/useTranslation";
import type { AIProcessResponse } from "@/lib/ai/types";

interface AIPreviewPanelProps {
  rawContent: string;
  result: AIProcessResponse;
  onEditSuggestion: (updated: AIProcessResponse) => void;
}

export function AIPreviewPanel({
  rawContent,
  result,
  onEditSuggestion,
}: AIPreviewPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Raw content pane */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {t("adminArticles.originalManuscript")}
        </h3>
        <div className="max-h-[600px] overflow-y-auto rounded-lg bg-muted/50 p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-muted-foreground">
            {rawContent}
          </pre>
        </div>
      </div>

      {/* AI-processed content pane */}
      <div className="rounded-xl border border-primary/30 bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
          {t("adminArticles.aiProcessedArticle")}
        </h3>
        <div className="max-h-[600px] overflow-y-auto">
          <MarkdownRenderer content={result.processedContent} />
        </div>
      </div>

      {/* Editable suggestions */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold">{t("adminArticles.reviewSuggestions")}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("adminArticles.titleLabel")}
            </label>
            <input
              type="text"
              value={result.suggestedTitle}
              onChange={(e) =>
                onEditSuggestion({ ...result, suggestedTitle: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("adminArticles.categoryLabel2")}
            </label>
            <input
              type="text"
              value={result.suggestedCategory}
              onChange={(e) =>
                onEditSuggestion({ ...result, suggestedCategory: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("adminArticles.excerptLabel")}
            </label>
            <textarea
              rows={2}
              value={result.suggestedExcerpt}
              onChange={(e) =>
                onEditSuggestion({ ...result, suggestedExcerpt: e.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("adminArticles.tagsLabel2")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {result.suggestedTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() =>
                      onEditSuggestion({
                        ...result,
                        suggestedTags: result.suggestedTags.filter((_, j) => j !== i),
                      })
                    }
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={t("adminArticles.addTagPlaceholder")}
                className="w-24 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    onEditSuggestion({
                      ...result,
                      suggestedTags: [...result.suggestedTags, e.currentTarget.value.trim()],
                    });
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("adminArticles.readingTime")}
            </label>
            <p className="text-sm">{t("adminArticles.readingTimeMinutes", { count: result.estimatedReadingTime })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
