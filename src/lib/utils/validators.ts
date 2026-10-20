import { z } from "zod";

// ── Auth ───────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const setupSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().min(1, "Display name is required"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

// ── Articles ───────────────────────────────────────────────────────
export const createArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1, "Content is required"),
  rawContent: z.string().optional(),
  coverImage: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  categoryId: z.number().int().positive().optional().nullable(),
  tagIds: z.array(z.number().int().positive()).optional(),
  isFeatured: z.boolean().optional(),
  aiMetadata: z.any().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).optional().nullable(),
  content: z.string().min(1).optional(),
  rawContent: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  categoryId: z.number().int().positive().optional().nullable(),
  tagIds: z.array(z.number().int().positive()).optional(),
  isFeatured: z.boolean().optional(),
  aiMetadata: z.any().optional(),
});

// ── Categories & Tags ──────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  slug: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().max(7).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  slug: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().max(7).optional(),
  sortOrder: z.number().int().optional(),
});

export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  slug: z.string().min(1).max(50).optional(),
});

// ── Comments ───────────────────────────────────────────────────────
export const createCommentSchema = z.object({
  authorName: z.string().min(1, "Name is required").max(50).optional(),
  authorEmail: z.string().email().optional().or(z.literal("")),
  content: z.string().min(1, "Comment is required").max(5000),
  parentId: z.number().int().positive().optional().nullable(),
});

// ── Settings ───────────────────────────────────────────────────────
export const updateSettingsSchema = z.record(z.string(), z.string());

// ── Pagination ─────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// ── Search ─────────────────────────────────────────────────────────
export const searchSchema = z.object({
  q: z.string().min(1, "Search query is required").max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
