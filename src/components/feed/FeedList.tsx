"use client";

import { useEffect, useRef, useCallback } from "react";
import { NDKFilter } from "@nostr-dev-kit/ndk";
import { usePausedFeed } from "@/hooks/usePausedFeed";
import { NewPostsIsland } from "./NewPostsIsland";
import { PostCard } from "@/components/post/PostCard";
import { FeedSkeleton } from "./FeedSkeleton";

interface FeedListProps {
  filter: NDKFilter;
  emptyMessage?: string;
}

export function FeedList({ filter, emptyMessage = "Nothing to see here yet." }: FeedListProps) {
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    usePausedFeed({ filter });

  const listTopRef = useRef<HTMLDivElement>(null);

  // Scroll to top when flushing new posts
  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  // Infinite scroll — Intersection Observer for load more
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: "400px" } 
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="relative">
      {/* Island — fixed, appears when new posts are in buffer */}
      <NewPostsIsland count={newCount} onFlush={handleFlush} />

      {/* Anchor for scroll-to-top */}
      <div ref={listTopRef} />

      {/* Loading skeleton */}
      {isLoading && posts.length === 0 && (
        <FeedSkeleton />
      )}

      {/* Empty state */}
      {!isLoading && posts.length === 0 && (
        <div className="py-16 text-center text-gray-500 px-4">
          <p className="text-4xl mb-3">🌐</p>
          <p className="text-lg font-medium">{emptyMessage}</p>
        </div>
      )}

      {/* Feed */}
      <div className="divide-y divide-gray-100 dark:divide-gray-900">
        {posts.map((event) => (
          <PostCard key={event.id} event={event} />
        ))}
      </div>

      {/* Load more trigger + indicator */}
      <div ref={bottomRef} className="py-12 flex justify-center">
        {hasMore && posts.length > 0 && (
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-500/40 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        {!hasMore && posts.length > 0 && (
          <p className="text-gray-500 text-sm font-medium">You've reached the end of the road</p>
        )}
      </div>
    </div>
  );
}
