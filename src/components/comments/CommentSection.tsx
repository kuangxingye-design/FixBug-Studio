"use client";

import { useState, useEffect, useCallback } from "react";
import { CommentList } from "./CommentList";
import { CommentForm } from "./CommentForm";
import { useTranslation } from "@/i18n/useTranslation";
import type { Comment } from "@/types";

interface CommentSectionProps {
  articleSlug: string;
}

export function CommentSection({ articleSlug }: CommentSectionProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${articleSlug}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [articleSlug]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleCommentPosted = () => {
    fetchComments();
  };

  return (
    <div className="mt-12 border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-bold">
        {t("comments.title")} {comments.length > 0 && `(${comments.length})`}
      </h2>

      <div className="mb-8">
        <CommentForm
          articleSlug={articleSlug}
          onSuccess={handleCommentPosted}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("comments.loading")}</p>
      ) : (
        <CommentList comments={comments} />
      )}
    </div>
  );
}
