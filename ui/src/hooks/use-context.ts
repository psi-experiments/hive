import { useEffect, useState } from "react";
import { ContextResponse } from "@/types/api";
import { apiFetch } from "@/lib/api";

export function useContext(taskId: string): { data: ContextResponse | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<ContextResponse>(`/tasks/${taskId}/context`)
      .then((res) => setData(res))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [taskId]);

  return { data, loading, error };
}
