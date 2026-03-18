import { useCallback, useEffect, useState } from "react";
import { Task } from "@/types/api";
import { apiFetch } from "@/lib/api";

export function useTasks(): { tasks: Task[] | null; error: string | null; refetch: () => void } {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    apiFetch<{ tasks: Task[] }>("/tasks")
      .then((data) => setTasks(data.tasks))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, error, refetch: fetchTasks };
}
