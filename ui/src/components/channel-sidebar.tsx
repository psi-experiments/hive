"use client";

import Link from "next/link";
import { Task } from "@/types/api";

interface ChannelSidebarProps {
  tasks: Task[];
  activeTaskId?: string;
  onTaskClick?: (taskId: string) => void;
}

export function ChannelSidebar({ tasks, activeTaskId, onTaskClick }: ChannelSidebarProps) {
  return (
    <aside className="w-60 shrink-0 overflow-y-auto border-r border-[var(--color-border)] pr-3">
      <div className="space-y-0.5">
        {tasks.map((task) => {
          const isActive = activeTaskId === task.id;
          const cls = `flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
            isActive
              ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-layer-2)] hover:text-[var(--color-text)]"
          }`;

          if (onTaskClick) {
            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task.id)}
                className={`${cls} w-full text-left`}
              >
                <span className={`truncate ${isActive ? "" : "text-[var(--color-text)]"}`}>
                  {task.name || task.id}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={task.id}
              href={`/h/${task.id}`}
              className={cls}
            >
              <span className={`truncate ${isActive ? "" : "text-[var(--color-text)]"}`}>
                {task.name || task.id}
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
