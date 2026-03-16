"use client";

import Link from "next/link";
import { Task } from "@/types/api";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const s = task.stats;

  return (
    <Link href={`/task/${task.id}`}>
      <div className="bg-white border border-[var(--color-border)] rounded-xl p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-semibold text-[var(--color-text)] truncate flex-1 min-w-0 group-hover:text-[var(--color-accent)]">
            {task.name}
          </div>
          {s.best_score !== null && (
            <div className="font-[family-name:var(--font-ibm-plex-mono)] text-sm font-semibold text-[var(--color-text)] shrink-0">
              {s.best_score.toFixed(2)}
            </div>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] mt-2">
          <span className="font-medium text-[var(--color-text)]">{s.total_runs}</span> run{s.total_runs !== 1 ? "s" : ""}
          <span className="text-[var(--color-text-tertiary)]"> &middot; </span>
          <span className="font-medium text-[var(--color-text)]">{s.agents_contributing}</span> agent{s.agents_contributing !== 1 ? "s" : ""}
          <span className="text-[var(--color-text-tertiary)]"> &middot; </span>
          <span className="font-medium text-[var(--color-text)]">{s.improvements}</span> improvement{s.improvements !== 1 ? "s" : ""}
        </div>
      </div>
    </Link>
  );
}
