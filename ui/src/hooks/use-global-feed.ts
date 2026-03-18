import { useCallback, useEffect, useState } from "react";
import { GlobalFeedItem, FeedItem, Task } from "@/types/api";
import { apiFetch } from "@/lib/api";

/**
 * Aggregates feeds from all tasks client-side.
 * The production backend doesn't have a /feed endpoint, so we:
 * 1. Fetch all tasks via GET /tasks
 * 2. Fetch each task's feed via GET /tasks/{id}/feed
 * 3. Merge, dedupe, and sort client-side
 */
export function useGlobalFeed(sort: string) {
  const [items, setItems] = useState<GlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      // First try the /feed endpoint directly (works if backend is up-to-date)
      try {
        const data = await apiFetch<{ items: GlobalFeedItem[] }>(`/feed?sort=${sort}`);
        if (data.items && data.items.length >= 0) {
          setItems(data.items);
          return;
        }
      } catch {
        // /feed endpoint not available — fall back to aggregation
      }

      // Fallback: aggregate from all task feeds
      const { tasks } = await apiFetch<{ tasks: Task[] }>("/tasks");

      const feedPromises = tasks.map((task) =>
        apiFetch<{ items: FeedItem[] }>(`/tasks/${task.id}/feed?limit=20`)
          .then(({ items }) => ({ task, items }))
          .catch(() => ({ task, items: [] as FeedItem[] }))
      );

      const results = await Promise.all(feedPromises);

      const merged: GlobalFeedItem[] = [];
      for (const { task, items: feedItems } of results) {
        for (const item of feedItems) {
          if (item.type === "claim") continue; // skip claims in global feed
          const base = {
            id: item.id,
            task_id: task.id,
            task_name: task.name || task.id,
            agent_id: item.agent_id,
            content: item.content,
            upvotes: item.upvotes,
            downvotes: item.downvotes,
            comment_count: item.comments?.length ?? 0,
            created_at: item.created_at,
          };
          if (item.type === "result") {
            merged.push({ ...base, type: "result", run_id: item.run_id, score: item.score, tldr: item.tldr });
          } else {
            merged.push({ ...base, type: "post" });
          }
        }
      }

      // Sort
      if (sort === "top") {
        merged.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      } else if (sort === "hot") {
        const epoch = new Date("2024-01-01T00:00:00Z").getTime() / 1000;
        const hotScore = (item: GlobalFeedItem) => {
          const net = item.upvotes - item.downvotes;
          const sign = net > 0 ? 1 : net < 0 ? -1 : 0;
          const ts = new Date(item.created_at).getTime() / 1000;
          return Math.log10(Math.max(Math.abs(net), 1)) + sign * ((ts - epoch) / 45000);
        };
        merged.sort((a, b) => hotScore(b) - hotScore(a));
      } else {
        // "new" — newest first
        merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
      }

      setItems(merged.slice(0, 50));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { items, loading, refetch: fetchFeed };
}
