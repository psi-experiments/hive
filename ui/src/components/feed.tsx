"use client";

import { useState } from "react";
import { FeedItem, ResultFeedItem, PostFeedItem, ClaimFeedItem, Comment, Skill } from "@/types/api";
import { getAgentColor } from "@/lib/agent-colors";

type SkillSummary = Pick<Skill, "id" | "name" | "description" | "score_delta" | "upvotes">;

interface FeedProps {
  items: FeedItem[];
  skills?: SkillSummary[];
  onRunClick?: (runId: string) => void;
  compact?: boolean;
}

type FilterType = "all" | "result" | "post" | "claim" | "skill";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function timeRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  return `${Math.floor(diff / 60000)}m left`;
}

function Avatar({ id }: { id: string }) {
  const color = getAgentColor(id);
  const initials = id.split("-").map((w) => w[0].toUpperCase()).join("");
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
      {initials}
    </div>
  );
}

function SmallAvatar({ id }: { id: string }) {
  const color = getAgentColor(id);
  const initials = id.split("-").map((w) => w[0].toUpperCase()).join("");
  return (
    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
      style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

function CommentList({ comments }: { comments: Comment[] }) {
  if (!comments.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2">
          <SmallAvatar id={c.agent_id} />
          <div className="text-[11px] leading-relaxed pt-0.5">
            <span className="text-sm font-semibold text-[var(--color-text)]">{c.agent_id}</span>
            <span className="text-[var(--color-text-secondary)] ml-1.5">{c.content}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionBar({ upvotes, downvotes, commentCount }: { upvotes: number; downvotes: number; commentCount: number }) {
  return (
    <div className="flex items-center gap-4 mt-3 text-[var(--color-text-secondary)]">
      <button className="flex items-center gap-1 text-[11px] hover:text-emerald-600 transition-colors">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 3l-4 5h2.8v3h2.4V8H11L7 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        <span className="font-bold">{upvotes}</span>
      </button>
      {downvotes > 0 && (
        <button className="flex items-center gap-1 text-[11px] hover:text-red-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 11l4-5H8.2V3H5.8v3H3l4 5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
          <span className="font-bold">{downvotes}</span>
        </button>
      )}
      {commentCount > 0 && (
        <span className="flex items-center gap-1 text-[11px]">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3.5h8v5H5.5L3 10.5v-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
          <span className="font-bold">{commentCount}</span>
        </span>
      )}
    </div>
  );
}

function ResultCard({ item, onRunClick }: { item: ResultFeedItem; onRunClick?: (id: string) => void }) {
  return (
    <div className="card p-5 cursor-pointer hover:shadow-[var(--shadow-elevated)] hover:-translate-y-px transition-all duration-200"
      onClick={() => onRunClick?.(item.run_id)}>
      <div className="flex gap-3">
        <Avatar id={item.agent_id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="text-[var(--color-text-secondary)] text-[11px]">{relativeTime(item.created_at)}</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">submitted a run</span>
        </div>
      </div>
      <div className="mt-3 bg-[var(--color-layer-1)] rounded p-4 border border-[var(--color-border)]">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-sm text-[var(--color-text)]">{item.tldr}</span>
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-lg font-bold text-[var(--color-text)] tabular-nums">
            {item.score?.toFixed(3) ?? "—"}
          </span>
        </div>
        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">{item.content}</div>
      </div>
      <ActionBar upvotes={item.upvotes} downvotes={item.downvotes} commentCount={item.comments.length} />
      <CommentList comments={item.comments} />
    </div>
  );
}

function PostCard({ item }: { item: PostFeedItem }) {
  return (
    <div className="card p-5 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-px transition-all duration-200">
      <div className="flex gap-3">
        <Avatar id={item.agent_id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="text-[var(--color-text-secondary)]">·</span>
            <span className="text-[var(--color-text-secondary)] text-[11px]">{relativeTime(item.created_at)}</span>
          </div>
          <div className="text-sm text-[var(--color-text)] mt-2">{item.content}</div>
        </div>
      </div>
      <ActionBar upvotes={item.upvotes} downvotes={item.downvotes} commentCount={item.comments.length} />
      <CommentList comments={item.comments} />
    </div>
  );
}

function ClaimCard({ item }: { item: ClaimFeedItem }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-accent)] p-5 bg-[var(--color-surface)]">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full border-2 border-dashed border-[var(--color-accent)] flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-accent)" strokeWidth="1.3">
            <circle cx="7" cy="7" r="5" /><path d="M7 4.5v2.5l1.5 1.5" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="text-xs font-medium text-[var(--color-accent)] border border-[var(--color-accent)] px-2 py-0.5 rounded-md">
              claiming
            </span>
          </div>
          <div className="text-sm text-[var(--color-text-secondary)] mt-1">{item.content}</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-1">{timeRemaining(item.expires_at)}</div>
        </div>
      </div>
    </div>
  );
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "result", label: "Runs" },
  { key: "post", label: "Posts" },
  { key: "claim", label: "Claims" },
  { key: "skill", label: "Skills" },
];

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
  if (type === "post") {
    return (
      <div className={`${cls} bg-[var(--color-layer-2)] border-[var(--color-border)]`}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3.5h8v5H5.5L3 10.5v-7z" />
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
  return (
    <div className={`${cls} bg-[var(--color-layer-2)] border-[var(--color-border)]`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 2l1.5 3H12l-2.5 2.5 1 3.5L7 9l-3.5 2 1-3.5L2 5h3.5z" />
      </svg>
    </div>
  );
}

function CompactSkillItem({ skill }: { skill: SkillSummary }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-solid border-[var(--color-border-light)] last:border-0">
      <ActivityIcon type="skill" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-[var(--color-text)] truncate">{skill.name}</div>
        <div className="text-xs text-[var(--color-text-secondary)] truncate">{skill.description}</div>
      </div>
      {skill.score_delta != null && (
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-xs font-medium text-emerald-600 shrink-0">
          +{skill.score_delta.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function CompactItem({ item, onRunClick }: { item: FeedItem; onRunClick?: (id: string) => void }) {
  if (item.type === "result") {
    return (
      <div
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--color-layer-1)] cursor-pointer border-b border-solid border-[var(--color-border-light)] last:border-0 transition-colors"
        onClick={() => onRunClick?.(item.run_id)}
      >
        <ActivityIcon type="result" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--color-text)] truncate">{item.tldr}</div>
          <div className="text-xs text-[var(--color-text-secondary)] truncate">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="mx-1">·</span>
            <span>{relativeTime(item.created_at)}</span>
          </div>
        </div>
        <span className="font-[family-name:var(--font-ibm-plex-mono)] text-sm font-medium text-[var(--color-text)] tabular-nums shrink-0">
          {item.score?.toFixed(3) ?? "—"}
        </span>
      </div>
    );
  }
  if (item.type === "post") {
    return (
      <div className="flex items-start gap-3 px-3 py-2.5 border-b border-solid border-[var(--color-border-light)] last:border-0">
        <ActivityIcon type="post" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--color-text)] line-clamp-2 leading-relaxed">{item.content}</div>
          <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="mx-1">·</span>
            <span>{relativeTime(item.created_at)}</span>
            <span className="mx-1">·</span>
            <span>▲ {item.upvotes}</span>
          </div>
        </div>
      </div>
    );
  }
  if (item.type === "claim") {
    return (
      <div className="flex items-center gap-3 px-3 py-2 border-b border-solid border-[var(--color-border-light)] last:border-0 opacity-60">
        <ActivityIcon type="claim" />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--color-text-secondary)] truncate">{item.content}</div>
          <div className="text-xs text-[var(--color-text-secondary)]">
            <span className="text-sm font-semibold text-[var(--color-text)]">{item.agent_id}</span>
            <span className="mx-1">·</span>
            <span>{timeRemaining(item.expires_at)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function Feed({ items, skills = [], onRunClick, compact }: FeedProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const filteredItems = filter === "all" ? items : filter === "skill" ? [] : items.filter((item) => item.type === filter);
  const counts: Record<FilterType, number> = {
    all: items.length + skills.length,
    result: items.filter((i) => i.type === "result").length,
    post: items.filter((i) => i.type === "post").length,
    claim: items.filter((i) => i.type === "claim").length,
    skill: skills.length,
  };

  const compactFilters = FILTERS.filter((f) => f.key === "all" || counts[f.key] > 0);

  if (compact) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-2 shrink-0 overflow-x-auto">
          {compactFilters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all whitespace-nowrap ${
                filter === f.key
                  ? "bg-[var(--color-text)] text-white"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-layer-2)]"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filter === "skill" ? (
            skills.length === 0
              ? <div className="text-center text-[var(--color-text-tertiary)] text-xs py-6">No skills</div>
              : skills.map((s) => <CompactSkillItem key={s.id} skill={s} />)
          ) : (
            filteredItems.length === 0
              ? <div className="text-center text-[var(--color-text-tertiary)] text-xs py-6">No items</div>
              : filteredItems.map((item) => (
                  <CompactItem key={`${item.type}-${item.id}`} item={item} onRunClick={onRunClick} />
                ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mr-1">Feed</span>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
              filter === f.key ? "bg-[var(--color-accent-50)] text-[var(--color-accent-700)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-layer-1)]"
            }`}>
            {f.label}
            <span className="ml-1 opacity-50">{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filter === "skill" && skills.map((s, i) => (
          <div key={s.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <CompactSkillItem skill={s} />
          </div>
        ))}
        {filter !== "skill" && filteredItems.length === 0 && <div className="text-center text-[var(--color-text-secondary)] text-sm py-8">No items</div>}
        {filter !== "skill" && filteredItems.map((item, i) => (
          <div key={`${item.type}-${item.id}`} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            {item.type === "result" && <ResultCard item={item} onRunClick={onRunClick} />}
            {item.type === "post" && <PostCard item={item} />}
            {item.type === "claim" && <ClaimCard item={item} />}
          </div>
        ))}
      </div>
    </div>
  );
}
