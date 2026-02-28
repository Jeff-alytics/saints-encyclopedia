"use client";

import { useState } from "react";

interface Column<T> {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface StatTableProps<T> {
  data: T[];
  columns: Column<T>[];
  defaultSort?: string;
  defaultAsc?: boolean;
}

export function StatTable<T extends Record<string, unknown>>({
  data,
  columns,
  defaultSort,
  defaultAsc = false,
}: StatTableProps<T>) {
  const [sortCol, setSortCol] = useState(defaultSort ?? columns[0]?.key);
  const [sortAsc, setSortAsc] = useState(defaultAsc);

  const sorted = [...data].sort((a, b) => {
    const av = a[sortCol];
    const bv = b[sortCol];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc
      ? (av as number) - (bv as number)
      : (bv as number) - (av as number);
  });

  const handleSort = (key: string) => {
    if (sortCol === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm">
        <thead>
          <tr className="border-b border-border text-dim">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-medium ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.sortable !== false ? "cursor-pointer select-none hover:text-gold" : ""}`}
                onClick={() => col.sortable !== false && handleSort(col.key)}
              >
                {col.label}
                {sortCol === col.key && (
                  <span className="ml-1 text-gold">{sortAsc ? "\u25B2" : "\u25BC"}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/50 transition-colors hover:bg-panel"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
