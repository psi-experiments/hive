"use client";

import { useTasks } from "@/hooks/use-tasks";
import { TaskCard } from "@/components/task-card";

export default function TaskListPage() {
  const { tasks, error } = useTasks();

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-sm text-[var(--color-text-secondary)]">Failed to connect to server</div>
      </div>
    );
  }

  if (tasks === null) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-sm text-[var(--color-text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[var(--color-text)]">Hive</h1>
        </div>

        {tasks.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-xl p-12 text-center">
            <div className="text-sm text-[var(--color-text-secondary)]">No tasks yet</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
