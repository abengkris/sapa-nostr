"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { PostCard } from "./PostCard";
import { Loader2 } from "lucide-react";

interface ThreadNodeProps {
  event: NDKEvent;
  depth?: number;
  isLast?: boolean;
  fetchReplies: (id: string) => Promise<NDKEvent[]>;
}

export const ThreadNode: React.FC<ThreadNodeProps> = ({ 
  event, 
  depth = 0, 
  isLast = false,
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

  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full">
        {/* Thread connection line for nested items */}
        {depth > 0 && (
          <div 
            className="absolute left-0 top-0 w-6 h-10 border-l-2 border-b-2 border-gray-200 dark:border-gray-800 rounded-bl-xl z-0"
            style={{ left: "-1.5rem", top: "-1rem" }}
          />
        )}

        <PostCard 
          event={event} 
          indent={0} // We handle indentation via the container now
          threadLine={nestedReplies.length > 0 && expanded ? "bottom" : "none"} 
        />
        
        {!hasFetched && depth < 3 && (
          <button 
            onClick={handleExpand}
            className="absolute left-6 bottom-2 z-20 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 bg-white dark:bg-black px-3 py-1 rounded-full border border-blue-500/20 shadow-sm transition-all active:scale-95"
          >
            {loading ? <Loader2 size={10} className="animate-spin" /> : "Show replies"}
          </button>
        )}
      </div>

      {expanded && nestedReplies.length > 0 && (
        <div 
          className={`flex flex-col ml-6 sm:ml-10 border-l-2 border-gray-100 dark:border-gray-800/50`}
        >
          {nestedReplies.map((reply, index) => (
            <div key={reply.id} className="pl-4 sm:pl-6">
              <ThreadNode 
                event={reply} 
                depth={depth + 1} 
                isLast={index === nestedReplies.length - 1}
                fetchReplies={fetchReplies} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
