"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n/useTranslation";

interface TOCItem {
  id: string;
  text: string;
  level: number;
  children: TOCItem[];
}

interface TableOfContentsProps {
  items: TOCItem[];
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    const headings = document.querySelectorAll("h2[id], h3[id]");
    headings.forEach((h) => observer.observe(h));

    return () => observer.disconnect();
  }, []);

  if (!items || items.length === 0) return null;

  const renderItems = (tocItems: TOCItem[], depth = 0) => (
    <ul className={`${depth > 0 ? "ml-3" : ""} space-y-1`}>
      {tocItems.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className={`block text-sm transition-colors hover:text-foreground ${
              activeId === item.id
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
            style={{ paddingLeft: `${(item.level - 2) * 12}px` }}
          >
            {item.text}
          </a>
          {item.children.length > 0 && renderItems(item.children, depth + 1)}
        </li>
      ))}
    </ul>
  );

  return (
    <nav className="sticky top-24">
      <h4 className="mb-3 text-sm font-semibold text-foreground">
        {t("articles.onThisPage")}
      </h4>
      {renderItems(items)}
    </nav>
  );
}
