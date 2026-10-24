"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n/useTranslation";
import type { Category } from "@/types";

interface CategorySelectorProps {
  value: string;
  onChange: (category: string) => void;
}

export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showDropdown]);

  const selected = categories.find((c) => c.name === value);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected?.name ?? t("categories.selectCategory")}
        </span>
        <svg
          className="h-4 w-4 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              onChange("");
              setShowDropdown(false);
            }}
          >
            {t("categories.none")}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                cat.name === value ? "bg-primary/10 text-primary" : ""
              }`}
              onClick={() => {
                onChange(cat.name);
                setShowDropdown(false);
              }}
            >
              {cat.color && (
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
              )}
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
