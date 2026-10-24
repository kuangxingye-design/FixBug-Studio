"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import { isImageFile } from "@/lib/markdown/images";

interface UploadZoneProps {
  /** The .md file plus any images dropped/selected alongside it. */
  onFiles: (file: File, images: File[]) => void;
  disabled?: boolean;
}

function isMarkdownFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".md") || name.endsWith(".markdown");
}

export function UploadZone({ onFiles, disabled = false }: UploadZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      validateAndSubmit(e.dataTransfer.files);
    },
    [onFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndSubmit(e.target.files);
      // Allow re-selecting the same files after a failed attempt.
      e.target.value = "";
    },
    [onFiles]
  );

  const validateAndSubmit = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const mdFiles = files.filter(isMarkdownFile);

    if (mdFiles.length === 0) {
      alert(t("adminArticles.onlyMdSupported"));
      return;
    }
    if (mdFiles.length > 1) {
      alert(t("adminArticles.onlyOneMdSupported"));
      return;
    }

    const [mdFile] = mdFiles;
    if (mdFile.size > 5 * 1024 * 1024) {
      alert(t("adminArticles.fileTooLarge"));
      return;
    }

    // Anything that isn't the document is treated as an image to upload alongside it.
    onFiles(mdFile, files.filter((file) => file !== mdFile && isImageFile(file)));
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={t("adminArticles.uploadMarkdown")}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50 hover:bg-accent/50"
      } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <svg
        className="mb-4 h-12 w-12 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      <p className="mb-1 text-base font-medium">
        {t("adminArticles.uploadMarkdown")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("adminArticles.uploadHint")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("adminArticles.uploadImagesHint")}
      </p>
    </div>
  );
}
