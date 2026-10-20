"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { TagSelector } from "./TagSelector";
import { CategorySelector } from "./CategorySelector";
import { useTranslation } from "@/i18n/useTranslation";
import type { AIProcessResponse } from "@/lib/ai/types";

interface AIOptionsPanelProps {
  suggestions: AIProcessResponse;
  onChange: (updated: AIProcessResponse) => void;
}

export function AIOptionsPanel({ suggestions, onChange }: AIOptionsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">{t("adminArticles.aiSuggestions")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("adminArticles.aiSuggestionsDesc")}
      </p>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("adminArticles.titleLabel")}</label>
        <Input
          value={suggestions.suggestedTitle}
          onChange={(e) =>
            onChange({ ...suggestions, suggestedTitle: e.target.value })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("adminArticles.excerptLabel")}</label>
        <Textarea
          rows={3}
          value={suggestions.suggestedExcerpt}
          onChange={(e) =>
            onChange({ ...suggestions, suggestedExcerpt: e.target.value })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("adminArticles.categoryLabel2")}</label>
        <CategorySelector
          value={suggestions.suggestedCategory}
          onChange={(cat) =>
            onChange({ ...suggestions, suggestedCategory: cat })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">{t("adminArticles.tagsLabel2")}</label>
        <TagSelector
          selected={suggestions.suggestedTags}
          onChange={(tags) =>
            onChange({ ...suggestions, suggestedTags: tags })
          }
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          {t("adminArticles.readingTime")}
        </label>
        <p className="text-sm text-muted-foreground">
          {t("adminArticles.readingTimeMinutes", { count: suggestions.estimatedReadingTime })}
        </p>
      </div>
    </div>
  );
}
