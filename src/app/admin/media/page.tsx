"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateShort } from "@/lib/utils/date";
import { useTranslation } from "@/i18n/useTranslation";

interface MediaItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

export default function MediaPage() {
  const { t, locale } = useTranslation();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/media");
      const data = await res.json();
      setMedia(data.media || []);
    } catch (error) {
      console.error("Failed to fetch media:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await fetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      fetchMedia();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("adminMedia.deleteConfirm"))) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    fetchMedia();
  };

  const handleCopyUrl = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl);
    alert(t("adminMedia.urlCopied"));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("adminMedia.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminMedia.description")}</p>
        </div>
        <label>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button variant="primary" disabled={uploading} onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.click()}>
            {uploading ? t("adminMedia.uploading") : t("adminMedia.uploadImage")}
          </Button>
        </label>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{t("common.loading")}</div>
      ) : media.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                <img
                  src={item.url}
                  alt={item.originalName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3 space-y-1">
                <p className="text-xs font-medium truncate">{item.originalName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(item.size)} · {formatDateShort(item.createdAt, locale)}
                </p>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => handleCopyUrl(item.url)}>{t("adminMedia.copyUrl")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)} className="text-red-500">{t("adminMedia.delete")}</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🖼️"
          title={t("adminMedia.noMedia")}
          description={t("adminMedia.noMediaDesc")}
        />
      )}
    </div>
  );
}
