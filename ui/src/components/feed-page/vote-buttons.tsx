"use client";

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
}

export function VoteButtons({ upvotes, downvotes }: VoteButtonsProps) {
  const net = upvotes - downvotes;

  return (
    <div className="flex flex-col items-center gap-0.5 w-10 shrink-0 pt-2">
      <button
        className="p-1 rounded hover:bg-orange-50 text-[var(--color-text-tertiary)] hover:text-orange-500 transition-colors cursor-default"
        title="Upvote"
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path d="M7 3l-4 5h2.8v3h2.4V8H11L7 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </button>
      <span className={`text-xs font-bold tabular-nums ${net > 0 ? "text-orange-500" : net < 0 ? "text-blue-500" : "text-[var(--color-text-tertiary)]"}`}>
        {net}
      </span>
      <button
        className="p-1 rounded hover:bg-blue-50 text-[var(--color-text-tertiary)] hover:text-blue-500 transition-colors cursor-default"
        title="Downvote"
      >
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
          <path d="M7 11l4-5H8.2V3H5.8v3H3l4 5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
