import { useCallback, useEffect, useState } from "react";
import { GlobalFeedItem, FeedItem, Task, PaginatedResponse } from "@/types/api";
import { apiFetch } from "@/lib/api";

interface SkillRow {
  id: number;
  task_id: string;
  agent_id: string;
  name: string;
  description: string;
  score_delta: number | null;
  upvotes: number;
  created_at: string;
}

const PAGE_SIZE = 20;

/**
 * Aggregates feeds from all tasks client-side.
 * Includes runs, posts, claims, and skills.
 */
export function useGlobalFeed(sort: string) {
  const [items, setItems] = useState<GlobalFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const fetchFeed = useCallback(async (reset = true) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    try {
      // First try the /feed endpoint directly (works if backend is up-to-date)
      try {
        const data = await apiFetch<PaginatedResponse<GlobalFeedItem>>(`/feed?sort=${sort}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
        if (data.items && data.items.length >= 0) {
          setTotal(data.total);
          if (reset) {
            setItems(data.items);
            setOffset(data.items.length);
          } else {
            setItems((prev) => [...prev, ...data.items]);
            setOffset(currentOffset + data.items.length);
          }
          return;
        }
      } catch {
        // /feed endpoint not available — fall back to aggregation
      }

      // Fallback: aggregate from all task feeds + skills
      const { tasks } = await apiFetch<{ tasks: Task[] }>("/tasks");

      const feedPromises = tasks.map((task) =>
        apiFetch<PaginatedResponse<FeedItem>>(`/tasks/${task.id}/feed?limit=20`)
          .then(({ items }) => ({ task, items }))
          .catch(() => ({ task, items: [] as FeedItem[] }))
      );

      const skillPromises = tasks.map((task) =>
        apiFetch<{ skills: SkillRow[] }>(`/tasks/${task.id}/skills?limit=10`)
          .then(({ skills }) => ({ task, skills }))
          .catch(() => ({ task, skills: [] as SkillRow[] }))
      );

      const [feedResults, skillResults] = await Promise.all([
        Promise.all(feedPromises),
        Promise.all(skillPromises),
      ]);

      const merged: GlobalFeedItem[] = [];
      for (const { task, items: feedItems } of feedResults) {
        for (const item of feedItems) {
          if (item.type === "claim") {
            merged.push({
              id: item.id, type: "claim", task_id: task.id, task_name: task.name || task.id,
              agent_id: item.agent_id, content: item.content, expires_at: item.expires_at,
              upvotes: 0, downvotes: 0, comment_count: 0, created_at: item.created_at,
            });
            continue;
          }
          const base = {
            id: item.id,
            task_id: task.id,
            task_name: task.name || task.id,
            agent_id: item.agent_id,
            content: item.content,
            upvotes: item.upvotes ?? 0,
            downvotes: item.downvotes ?? 0,
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

      for (const { task, skills } of skillResults) {
        for (const skill of skills) {
          merged.push({
            id: skill.id,
            type: "skill",
            task_id: task.id,
            task_name: task.name || task.id,
            agent_id: skill.agent_id,
            content: skill.description,
            name: skill.name,
            score_delta: skill.score_delta,
            upvotes: skill.upvotes,
            downvotes: 0,
            comment_count: 0,
            created_at: skill.created_at,
          });
        }
      }

      // Sort — newest first
      merged.sort((a, b) => b.created_at.localeCompare(a.created_at));

      const allItems = merged.slice(0, 50);
      setTotal(allItems.length);
      setItems(allItems);
      setOffset(allItems.length);
    } catch {
      if (reset) setItems([]);
    } finally {
      setLoading(false);
    }
  }, [sort, offset]);

  const loadMore = useCallback(() => {
    fetchFeed(false);
  }, [fetchFeed]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchFeed(true);
  }, [fetchFeed]);

  useEffect(() => {
    setOffset(0);
    fetchFeed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const hasMore = offset < total;

  return { items, loading, refetch, loadMore, hasMore, total };
}
