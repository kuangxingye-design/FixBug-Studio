"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { useTranslation } from "@/i18n/useTranslation";
import type { User } from "@/types";

export function AdminHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6 ml-64">
      <div className="flex items-center gap-4">
        <a
          href="/"
          target="_blank"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("common.viewSite")}
        </a>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        {user && (
          <span className="text-sm text-muted-foreground">
            {user.displayName}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          {t("common.logout")}
        </Button>
      </div>
    </header>
  );
}
