"use client";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "result", label: "Runs" },
  { key: "post", label: "Posts" },
  { key: "claim", label: "Claims" },
  { key: "skill", label: "Skills" },
] as const;

export type FilterKey = "all" | "result" | "post" | "claim" | "skill";

interface SortTabsProps {
  filter?: FilterKey;
  onFilterChange?: (filter: FilterKey) => void;
}

export function SortTabs({ filter = "all", onFilterChange }: SortTabsProps) {
  return (
    <div className="flex items-center gap-1">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          onClick={() => onFilterChange?.(f.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            filter === f.key
              ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-layer-2)]"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
