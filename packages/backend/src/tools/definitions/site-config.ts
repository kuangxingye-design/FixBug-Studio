import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import type { ToolDefinition } from "../types.js";
import { db } from "../../db/connection.js";
import { siteConfigs } from "../../db/schema.js";

// ============================================================
// T-30: get_site_config — Get site configuration (KV store)
// ============================================================

const getSiteConfigSchema = z.object({
  keys: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional()
    .describe("Filter by specific keys. Omit to get all configs."),
});

type GetSiteConfigParams = z.infer<typeof getSiteConfigSchema>;

export const getSiteConfigTool: ToolDefinition<
  typeof getSiteConfigSchema,
  Record<string, string>
> = {
  name: "get_site_config",
  description:
    "获取站点设置（键值对）。可按 key 筛选，不传 keys 则返回全部配置。",
  schema: getSiteConfigSchema,
  permission: "guest",
  sideEffect: "read",
  confirmation: "never",
  rateLimit: { max: 30, windowSeconds: 60 },

  async handler(params: GetSiteConfigParams) {
    let rows;

    if (params.keys && params.keys.length > 0) {
      rows = await db
        .select()
        .from(siteConfigs)
        .where(inArray(siteConfigs.key, params.keys));
    } else {
      rows = await db.select().from(siteConfigs);
    }

    // Convert to simple key-value object
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }

    return config;
  },
};
