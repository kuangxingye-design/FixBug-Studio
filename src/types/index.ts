export type ArticleStatus = "draft" | "published" | "archived";
export type CommentStatus = "pending" | "approved" | "rejected";

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  articleCount?: number;
  createdAt: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  articleCount?: number;
  createdAt: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  rawContent: string | null;
  coverImage: string | null;
  status: ArticleStatus;
  categoryId: number | null;
  category: Category | null;
  tags: Tag[];
  readingTime: number | null;
  isFeatured: boolean;
  viewCount: number;
  aiMetadata: unknown;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleVersion {
  id: number;
  articleId: number;
  title: string;
  content: string;
  excerpt: string | null;
  version: number;
  changeNote: string | null;
  createdAt: string;
}

export interface Comment {
  id: number;
  articleId: number;
  parentId: number | null;
  authorName: string | null;
  authorEmail: string | null;
  content: string;
  status: CommentStatus;
  isAdmin: boolean;
  replies?: Comment[];
  createdAt: string;
}

export interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  altText: string | null;
  createdAt: string;
}

export interface SiteSettings {
  [key: string]: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

// AI Processing types
export interface AIProcessResult {
  processedContent: string;
  suggestedTitle: string;
  suggestedTags: string[];
  suggestedCategory: string;
  suggestedExcerpt: string;
  estimatedReadingTime: number;
}

export interface AIMergeResult {
  mergedContent: string;
  summary: string;
  changeHighlights: string[];
}
