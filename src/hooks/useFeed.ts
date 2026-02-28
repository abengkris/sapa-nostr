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

        // Filter based on Concept #5: Feed filtering
        const filteredPosts = newPosts.filter(ev => {
          const eTags = ev.tags.filter(t => t[0] === 'e');
          const isReply = eTags.some(t => t[3] === 'reply' || t[3] === 'root');
          
          if (!isReply) return true; // Standalone, Repost, Quote always show

          // If it's a reply, only show if:
          // 1. In global feed, we generally hide replies to keep it clean
          if (authors.length === 0) return false;

          // 2. In following feed, show if it's a reply to someone the user follows
          // (Simplified: we show all replies in following feed for now, 
          // or we can check if the recipient pubkey is in the authors list)
          const replyPTag = ev.tags.find(t => t[0] === 'p');
          if (replyPTag && authors.includes(replyPTag[1])) return true;
          
          // 3. Thread continuation (reply to self)
          if (replyPTag && replyPTag[1] === ev.pubkey) return true;

          return false;
        });

        // Keep state small for performance (virtualization ready)
        const slicedPosts = filteredPosts.slice(0, MAX_POSTS);

        // Update oldest timestamp for pagination from the full list if possible
        const lastPost = slicedPosts[slicedPosts.length - 1];
        oldestTimestampRef.current = lastPost?.created_at;

        return slicedPosts;
      });
    });

    sub.on("eose", () => {
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
