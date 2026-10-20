"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useTranslation } from "@/i18n/useTranslation";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("adminSettings.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminSettings.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-sm text-green-600">{t("adminSettings.saved")}</span>}
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? t("adminSettings.saving") : t("adminSettings.saveChanges")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Blog Info */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminSettings.blogInformation")}</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.siteName")}</label>
              <Input value={settings.site_name || ""} onChange={(e) => updateSetting("site_name", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.siteDescription")}</label>
              <Textarea rows={2} value={settings.site_description || ""} onChange={(e) => updateSetting("site_description", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.postsPerPage")}</label>
              <Input type="number" value={settings.posts_per_page || "10"} onChange={(e) => updateSetting("posts_per_page", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminSettings.socialLinks")}</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.github")}</label>
              <Input placeholder="https://github.com/..." value={settings.social_github || ""} onChange={(e) => updateSetting("social_github", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.twitter")}</label>
              <Input placeholder="https://twitter.com/..." value={settings.social_twitter || ""} onChange={(e) => updateSetting("social_twitter", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.linkedin")}</label>
              <Input placeholder="https://linkedin.com/in/..." value={settings.social_linkedin || ""} onChange={(e) => updateSetting("social_linkedin", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminSettings.comments")}</h3></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("adminSettings.enableComments")}</p>
                <p className="text-xs text-muted-foreground">{t("adminSettings.enableCommentsDesc")}</p>
              </div>
              <select
                value={settings.enable_comments || "true"}
                onChange={(e) => updateSetting("enable_comments", e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="true">{t("adminSettings.enabled")}</option>
                <option value="false">{t("adminSettings.disabled")}</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("adminSettings.autoApproveComments")}</p>
                <p className="text-xs text-muted-foreground">{t("adminSettings.autoApproveCommentsDesc")}</p>
              </div>
              <select
                value={settings.auto_approve_comments || "false"}
                onChange={(e) => updateSetting("auto_approve_comments", e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
              >
                <option value="false">{t("adminSettings.moderated")}</option>
                <option value="true">{t("adminSettings.autoApproved")}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Footer & About */}
        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminSettings.footerAbout")}</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.footerText")}</label>
              <Input value={settings.footer_text || ""} onChange={(e) => updateSetting("footer_text", e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminSettings.aboutContent")}</label>
              <Textarea
                rows={6}
                value={settings.about_content || ""}
                onChange={(e) => updateSetting("about_content", e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
