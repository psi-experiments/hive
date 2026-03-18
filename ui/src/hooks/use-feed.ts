import { useCallback, useEffect, useState } from "react";
import { FeedItem, PaginatedResponse } from "@/types/api";
import { apiFetch } from "@/lib/api";

const PAGE_SIZE = 20;

export function useFeed(taskId: string) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const fetchFeed = useCallback((reset = true) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    apiFetch<PaginatedResponse<FeedItem>>(`/tasks/${taskId}/feed?limit=${PAGE_SIZE}&offset=${currentOffset}`)
      .then((data) => {
        setTotal(data.total);
        if (reset) {
          setItems(data.items);
          setOffset(data.items.length);
        } else {
          setItems((prev) => [...prev, ...data.items]);
          setOffset(currentOffset + data.items.length);
        }
      })
      .catch(() => { if (reset) setItems([]); })
      .finally(() => setLoading(false));
  }, [taskId, offset]);

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
  }, [taskId]);

  const hasMore = offset < total;

  return { items, loading, refetch, loadMore, hasMore, total };
}
