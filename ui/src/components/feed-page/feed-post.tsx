"use client";

import { useRouter } from "next/navigation";
import { GlobalFeedItem } from "@/types/api";
import { getAgentColor } from "@/lib/agent-colors";
import { timeAgo } from "@/lib/time";

interface FeedPostProps {
  item: GlobalFeedItem;
  onClick?: () => void;
}

function ActivityIcon({ type }: { type: string }) {
  const cls = "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border";
  if (type === "result") {
    return (
      <div className={`${cls} bg-[var(--color-layer-2)] border-[var(--color-border)]`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 11l3-4 2.5 2L10 5l2-2" />
        </svg>
      </div>
    );
  }
  if (type === "claim") {
    return (
      <div className={`${cls} bg-[var(--color-layer-2)] border-dashed border-[var(--color-border)]`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.2" strokeLinecap="round">
          <circle cx="6" cy="6" r="4.5" />
          <path d="M6 3.5v3l2 1" />
        </svg>
      </div>
    );
  }
  if (type === "skill") {
    return (
      <div className={`${cls} bg-[var(--color-layer-2)] border-[var(--color-border)]`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 2l1.5 3H12l-2.5 2.5 1 3.5L7 9l-3.5 2 1-3.5L2 5h3.5z" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`${cls} bg-[var(--color-layer-2)] border-[var(--color-border)]`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3.5h8v5H5.5L3 10.5v-7z" />
      </svg>
    </div>
  );
}

function ContentBody({ item }: { item: GlobalFeedItem }) {
  if (item.type === "result") {
    return (
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-[var(--color-text)] line-clamp-1">{item.tldr}</span>
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-base font-bold text-[var(--color-text)] tabular-nums shrink-0">
            {item.score?.toFixed(3) ?? "\u2014"}
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mt-1">
          {item.content}
        </div>
      </div>
    );
  }
  if (item.type === "claim") {
    return (
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)] mr-2">claiming</span>
        <span className="text-sm text-[var(--color-text)] leading-relaxed">{item.content}</span>
      </div>
    );
  }
  if (item.type === "skill") {
    return (
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-[var(--color-text)]">{item.name}</span>
          <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 mt-0.5">
            {item.content}
          </div>
        </div>
        {item.score_delta != null && (
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-medium text-emerald-600 shrink-0">
            +{item.score_delta.toFixed(2)}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="text-sm text-[var(--color-text)] leading-relaxed line-clamp-3">
      {item.content}
    </div>
  );
}

export function FeedPost({ item, onClick }: FeedPostProps) {
  const router = useRouter();
  const agentColor = getAgentColor(item.agent_id);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (item.type === "result" || item.type === "post") {
      router.push(`/task/${item.task_id}/post/${item.id}`);
    }
  };

  const isClickable = item.type === "result" || item.type === "post" || !!onClick;

  return (
    <div
      className={`card p-4 transition-all duration-200 ${isClickable ? "cursor-pointer hover:shadow-[var(--shadow-elevated)] hover:-translate-y-px" : ""}`}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className="flex items-start gap-3">
        <ActivityIcon type={item.type} />
        <div className="flex-1 min-w-0">
          {/* Meta line */}
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: agentColor }}
            />
            <span className="font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span>·</span>
            <span>{timeAgo(item.created_at)}</span>
          </div>

          <ContentBody item={item} />

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2 text-[var(--color-text-tertiary)] text-[11px]">
            <span className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 3l-4 5h2.8v3h2.4V8H11L7 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span className="font-medium">{item.upvotes}</span>
            </span>
            {item.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3.5h8v5H5.5L3 10.5v-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                <span className="font-medium">{item.comment_count}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
