import { db } from "@/lib/db";
import { articles, comments } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { getTranslation } from "@/i18n/getTranslation";

async function getStats() {
  const [articleCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .all();

  const [publishedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, "published"))
    .all();

  const [draftCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, "draft"))
    .all();

  const [pendingCommentCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(comments)
    .where(eq(comments.status, "pending"))
    .all();

  const [totalViews] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${articles.viewCount}), 0)`,
    })
    .from(articles)
    .all();

  return {
    totalArticles: articleCount?.count ?? 0,
    published: publishedCount?.count ?? 0,
    drafts: draftCount?.count ?? 0,
    pendingComments: pendingCommentCount?.count ?? 0,
    totalViews: totalViews?.total ?? 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const { t } = await getTranslation();

  const statCards = [
    { label: t("admin.totalArticles"), value: stats.totalArticles, icon: "📝" },
    { label: t("admin.published"), value: stats.published, icon: "✅" },
    { label: t("admin.drafts"), value: stats.drafts, icon: "📄" },
    { label: t("admin.pendingComments"), value: stats.pendingComments, icon: "💬" },
    { label: t("admin.totalViews"), value: stats.totalViews, icon: "👁️" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("admin.dashboard")}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <span className="text-2xl">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">{t("admin.quickActions")}</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/articles/new"
              className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{t("admin.createNewArticle")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.createNewArticleDesc")}
              </p>
            </a>
            <a
              href="/admin/articles"
              className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{t("admin.manageArticles")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.manageArticlesDesc")}
              </p>
            </a>
            <a
              href="/admin/settings"
              className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent"
            >
              <h3 className="font-medium">{t("admin.siteSettings")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("admin.siteSettingsDesc")}
              </p>
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">{t("admin.aboutThisBlog")}</h2>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t("admin.aboutDesc1")}</p>
            <p>{t("admin.aboutDesc2")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
