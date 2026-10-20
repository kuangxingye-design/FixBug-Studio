"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";
import type { ArticleVersion } from "@/types";

interface VersionHistoryProps {
  versions: ArticleVersion[];
  onRestore: (version: ArticleVersion) => void;
  currentVersion: number;
}

export function VersionHistory({
  versions,
  onRestore,
  currentVersion,
}: VersionHistoryProps) {
  const { t, locale } = useTranslation();

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("versionHistory.noHistory")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <Card key={version.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                v{version.version}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {version.changeNote || t("versionHistory.version", { version: version.version })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(version.createdAt, locale)} — &quot;{version.title}&quot;
                </p>
              </div>
              {version.version === currentVersion && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {t("versionHistory.current")}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRestore(version)}
              disabled={version.version === currentVersion}
            >
              {t("versionHistory.restore")}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
