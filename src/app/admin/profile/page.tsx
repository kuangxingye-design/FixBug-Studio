"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useTranslation } from "@/i18n/useTranslation";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [user, setUser] = useState({
    displayName: "",
    email: "",
    bio: "",
    avatarUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser({
            displayName: data.user.displayName || "",
            email: data.user.email || "",
            bio: data.user.bio || "",
            avatarUrl: data.user.avatarUrl || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/articles", { method: "PUT" });
      alert(t("adminProfile.profileSaved"));
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    try {
      alert(t("adminProfile.passwordNotImplemented"));
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      console.error("Failed to change password:", error);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t("adminProfile.title")}</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminProfile.profileInformation")}</h3></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">{t("adminProfile.displayName")}</label>
              <Input value={user.displayName} onChange={(e) => setUser({ ...user, displayName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminProfile.email")}</label>
              <Input type="email" value={user.email} onChange={(e) => setUser({ ...user, email: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminProfile.bio")}</label>
              <Textarea rows={3} value={user.bio} onChange={(e) => setUser({ ...user, bio: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm">{t("adminProfile.avatarUrl")}</label>
              <Input value={user.avatarUrl} onChange={(e) => setUser({ ...user, avatarUrl: e.target.value })} placeholder={t("adminProfile.avatarUrlPlaceholder")} />
            </div>
            <Button variant="primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? t("adminProfile.saving") : t("adminProfile.saveProfile")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="font-semibold">{t("adminProfile.changePassword")}</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">{t("adminProfile.currentPassword")}</label>
                <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-sm">{t("adminProfile.newPassword")}</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" variant="outline" disabled={passwordSaving}>
                {passwordSaving ? t("adminProfile.changing") : t("adminProfile.changePasswordBtn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
