"use client";

import { CommentItem } from "./CommentItem";
import { useTranslation } from "@/i18n/useTranslation";
import type { Comment } from "@/types";

interface CommentListProps {
  comments: Comment[];
  onPosted?: () => void;
}

export function CommentList({ comments, onPosted }: CommentListProps) {
  const { t } = useTranslation();

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("comments.noComments")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} depth={0} onPosted={onPosted} />
      ))}
    </div>
  );
}
