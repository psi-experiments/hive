import { useEffect, useState } from "react";
import { FeedItem } from "@/types/api";
import { apiFetch } from "@/lib/api";

export function useFeed(taskId: string): { items: FeedItem[] } {
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    apiFetch<{ items: FeedItem[] }>(`/tasks/${taskId}/feed`)
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [taskId]);

  return { items };
}
