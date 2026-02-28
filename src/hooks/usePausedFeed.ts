"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

interface UsePausedFeedOptions {
  filter: NDKFilter;
  bufferDelay?: number;
  maxBuffer?: number;
  maxVisible?: number;
}

interface UsePausedFeedReturn {
  posts: NDKEvent[];            
  newCount: number;             
  isLoading: boolean;
  flushNewPosts: () => void;    
  loadMore: () => void;         
  hasMore: boolean;
}

export function usePausedFeed({
  filter,
  bufferDelay = 1500,
  maxBuffer = 50,
  maxVisible = 100,
}: UsePausedFeedOptions): UsePausedFeedReturn {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [oldestTimestamp, setOldestTimestamp] = useState<number | undefined>();

  const bufferRef = useRef<NDKEvent[]>([]);
  const isInitialLoadDone = useRef(false);
  const bufferDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const subRef = useRef<NDKSubscription | null>(null);

  useEffect(() => {
    if (!ndk || !isReady) return;

    isInitialLoadDone.current = false;
    setIsLoading(true);
    setNewCount(0);
    bufferRef.current = [];
    seenIds.current = new Set();
    setPosts([]);

    const sub = ndk.subscribe(
      { ...filter, limit: 20 },
      { closeOnEose: false }
    );
    subRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      if (!isInitialLoadDone.current) {
        setPosts(prev => {
          const next = [...prev, event].sort(
            (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
          );
          return next.slice(0, maxVisible);
        });
      } else {
        bufferRef.current = [event, ...bufferRef.current]
          .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
          .slice(0, maxBuffer);
        setNewCount(bufferRef.current.length);
      }
    });

    sub.on("eose", () => {
      setIsLoading(false);
      if (bufferDelayTimer.current) clearTimeout(bufferDelayTimer.current);
      bufferDelayTimer.current = setTimeout(() => {
        isInitialLoadDone.current = true;
      }, bufferDelay);
    });

    return () => {
      sub.stop();
      subRef.current = null;
      if (bufferDelayTimer.current) clearTimeout(bufferDelayTimer.current);
    };
  }, [ndk, isReady, JSON.stringify(filter), bufferDelay, maxBuffer, maxVisible]);

  useEffect(() => {
    if (posts.length > 0) {
      const oldest = posts[posts.length - 1].created_at;
      setOldestTimestamp(oldest);
    }
  }, [posts]);

  const flushNewPosts = useCallback(() => {
    if (bufferRef.current.length === 0) return;

    setPosts(prev => {
      const combined = [...bufferRef.current, ...prev];
      const unique = Array.from(
        new Map(combined.map(e => [e.id, e])).values()
      ).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return unique.slice(0, maxVisible);
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [maxVisible]);

  const loadMore = useCallback(async () => {
    if (!ndk || !oldestTimestamp || !hasMore) return;

    const olderPosts = await ndk.fetchEvents({
      ...filter,
      until: oldestTimestamp - 1,
      limit: 20,
    });

    const sorted = Array.from(olderPosts).sort(
      (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
    );

    if (sorted.length < 20) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...sorted];
      const unique = Array.from(
        new Map(combined.map(e => [e.id, e])).values()
      ).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      return unique.slice(0, maxVisible + 50); // allow slightly more for scrolling
    });
  }, [ndk, oldestTimestamp, hasMore, filter, maxVisible]);

  return { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore };
}
