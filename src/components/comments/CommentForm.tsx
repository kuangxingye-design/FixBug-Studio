"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useTranslation } from "@/i18n/useTranslation";

interface CommentFormProps {
  articleSlug: string;
  parentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommentForm({
  articleSlug,
  parentId,
  onSuccess,
  onCancel,
}: CommentFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/articles/${articleSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: name || undefined,
          authorEmail: email || undefined,
          content: content.trim(),
          parentId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t("comments.failedToPost"));
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setContent("");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("comments.failedToPost"));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {t("comments.submitted")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-3">
        <Input
          placeholder={t("comments.namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <Input
          type="email"
          placeholder={t("comments.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
      </div>
      <Textarea
        rows={4}
        placeholder={t("comments.contentPlaceholder")}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={submitting}>
          {submitting ? t("comments.posting") : parentId ? t("comments.reply") : t("comments.postComment")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t("comments.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
