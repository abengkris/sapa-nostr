import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";

const MAX_POSTS = 100;

export function useFeed(authors: string[]) {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [limit, setLimit] = useState(20);
  
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const realtimeSubRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.stop();
      subscriptionRef.current = null;
    }
    if (realtimeSubRef.current) {
      realtimeSubRef.current.stop();
      realtimeSubRef.current = null;
    }
  }, []);

  const fetchFeed = useCallback((isLoadMore = false) => {
    if (!ndk || !isReady || authors.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const filter: NDKFilter = {
      kinds: [1],
      authors: authors,
      limit: limit,
    };

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    // Stop previous fetch subscription if exists
    if (subscriptionRef.current) subscriptionRef.current.stop();

    const sub = ndk.subscribe(filter, { closeOnEose: true });
    subscriptionRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      setPosts((prev) => {
        if (prev.find((p) => p.id === event.id)) return prev;
        
        const newPosts = [...prev, event].sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        );

        // Keep state small for performance (virtualization ready)
        const slicedPosts = newPosts.slice(0, MAX_POSTS);

        // Update oldest timestamp for pagination from the full list if possible
        const lastPost = slicedPosts[slicedPosts.length - 1];
        oldestTimestampRef.current = lastPost?.created_at;

        return slicedPosts;
      });
    });

    sub.on("eose", () => {
      setLoading(false);
    });

    sub.on("error", (err) => {
      console.error("Feed subscription error:", err);
      setLoading(false);
    });
  }, [ndk, isReady, authors, limit]);

  // Initial subscription for real-time updates (top of the feed)
  useEffect(() => {
    if (!ndk || !isReady || authors.length === 0) return;

    const realtimeFilter: NDKFilter = {
      kinds: [1],
      authors: authors,
      since: Math.floor(Date.now() / 1000),
    };

    const sub = ndk.subscribe(realtimeFilter, { closeOnEose: false });
    realtimeSubRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      setPosts((prev) => {
        if (prev.find((p) => p.id === event.id)) return prev;
        const newPosts = [event, ...prev].sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        );
        return newPosts.slice(0, MAX_POSTS);
      });
    });

    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.stop();
    };
  }, [ndk, isReady, authors]);

  // Initial fetch and global cleanup
  useEffect(() => {
    setPosts([]);
    oldestTimestampRef.current = undefined;
    fetchFeed();
    
    return () => cleanupSubscriptions();
  }, [ndk, isReady, authors, fetchFeed, cleanupSubscriptions]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchFeed(true);
    }
  };

  return { posts, loading, loadMore, hasMore };
}
