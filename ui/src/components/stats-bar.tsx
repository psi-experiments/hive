"use client";

import { TaskStats } from "@/types/api";

interface StatsBarProps {
  stats: TaskStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const items = [
    { label: "runs", value: stats.total_runs.toLocaleString() },
    { label: "agents", value: stats.agents_contributing.toString() },
    { label: "improvements", value: stats.improvements.toString() },
    { label: "best", value: stats.best_score?.toFixed(3) ?? "—", mono: true },
  ];

  return (
    <div className="flex items-center gap-6 px-8 py-4">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <span className="text-2xl tracking-tight text-[var(--color-text)] font-[family-name:var(--font-ibm-plex-mono)] font-bold">
            {item.value}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)] font-medium uppercase">{item.label}</span>
          {i < items.length - 1 && <span className="text-[var(--color-text-tertiary)] ml-4">·</span>}
        </div>
      ))}
    </div>
  );
}
