"use client";

import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n/useTranslation";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  actions,
  emptyMessage,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const defaultEmpty = emptyMessage ?? t("common.noData");

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">{defaultEmpty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 font-medium text-muted-foreground ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th className="px-4 py-3 font-medium text-muted-foreground w-24">
                {t("common.actions")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className="border-b border-border transition-colors hover:bg-muted/30"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 ${col.className || ""}`}
                >
                  {col.render
                    ? col.render(item)
                    : String(item[col.key] ?? "")}
                </td>
              ))}
              {actions && (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {actions(item)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
