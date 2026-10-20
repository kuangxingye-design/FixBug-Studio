"use client";

import { useState } from "react";
import { CommentForm } from "./CommentForm";
import { formatRelativeTime } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";
import type { Comment } from "@/types";

interface CommentItemProps {
  comment: Comment;
  depth: number;
  articleSlug?: string;
}

export function CommentItem({ comment, depth, articleSlug = "" }: CommentItemProps) {
  const { t, locale } = useTranslation();
  const [showReply, setShowReply] = useState(false);

  const maxDepth = 3;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${
        depth > 0 ? "ml-6" : ""
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">
          {comment.authorName || t("comments.anonymous")}
        </span>
        {comment.isAdmin && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
            {t("comments.authorBadge")}
          </span>
        )}
        <span className="text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(comment.createdAt, locale)}
        </span>
      </div>
      <div className="text-sm text-foreground whitespace-pre-wrap">
        {comment.content}
      </div>
      {depth < maxDepth && (
        <div className="mt-2">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("comments.reply")}
            </button>
          ) : (
            <div className="mt-3">
              <CommentForm
                articleSlug={articleSlug}
                parentId={comment.id}
                onSuccess={() => setShowReply(false)}
                onCancel={() => setShowReply(false)}
              />
            </div>
          )}
        </div>
      )}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              articleSlug={articleSlug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
