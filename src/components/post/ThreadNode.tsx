"use client";

import React, { useState, useEffect } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { PostCard } from "./PostCard";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface ThreadNodeProps {
  event: NDKEvent;
  depth?: number;
  fetchReplies: (id: string) => Promise<NDKEvent[]>;
}

export const ThreadNode: React.FC<ThreadNodeProps> = ({ 
  event, 
  depth = 0, 
  fetchReplies 
}) => {
  const [nestedReplies, setNestedReplies] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(depth < 1); // Auto-expand first level
  const [hasFetched, setHasFetched] = useState(false);

  const handleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);

    if (newExpanded && !hasFetched) {
      setLoading(true);
      const replies = await fetchReplies(event.id);
      setNestedReplies(replies);
      setHasFetched(true);
      setLoading(false);
    }
  };

  // We can't easily know if an event HAS replies without fetching
  // But we can check if there are any mentions of this event ID in the current session (complex)
  // For now, we'll just show an "Expand" button if depth is low or if it's explicitly clicked.

  return (
    <div className="flex flex-col">
      <div className="relative">
        <PostCard 
          event={event} 
          indent={depth} 
          threadLine={nestedReplies.length > 0 && expanded ? "bottom" : "none"} 
        />
        
        {/* Simple "Load Replies" button for nested content */}
        {!hasFetched && depth < 3 && (
          <button 
            onClick={handleExpand}
            className="absolute left-[1.5rem] bottom-2 z-20 text-[10px] font-bold text-blue-500 hover:underline bg-white dark:bg-black px-2 py-0.5 rounded-full border border-blue-500/20"
            style={{ marginLeft: `${depth * 1.5}rem` }}
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : "Show replies"}
          </button>
        )}
      </div>

      {expanded && nestedReplies.length > 0 && (
        <div className="flex flex-col">
          {nestedReplies.map(reply => (
            <ThreadNode 
              key={reply.id} 
              event={reply} 
              depth={depth + 1} 
              fetchReplies={fetchReplies} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
