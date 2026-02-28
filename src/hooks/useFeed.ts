import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

const MAX_POSTS = 100;

export function useFeed(authors: string[], kinds: number[] = [1], disableFiltering: boolean = false) {
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
    if (!ndk || !isReady) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const filter: NDKFilter = {
      kinds: kinds,
      limit: limit,
    };

    // Only add authors to filter if provided
    if (authors && authors.length > 0) {
      filter.authors = authors;
    }

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    // Stop previous fetch subscription if exists
    if (subscriptionRef.current) subscriptionRef.current.stop();

    const sub = ndk.subscribe(
      filter, 
      { closeOnEose: true, groupable: false, cacheUnconstrainFilter: ["limit"] }
    );
    subscriptionRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      setPosts((prev) => {
        if (prev.find((p) => p.id === event.id)) return prev;
        
        const newPosts = [...prev, event].sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        );

        // Filter based on Concept #5: Feed filtering
        let filteredPosts = newPosts;
        
        if (!disableFiltering && kinds.includes(1)) {
          filteredPosts = newPosts.filter(ev => {
            const eTags = ev.tags.filter(t => t[0] === 'e');
            const isReply = eTags.some(t => t[3] === 'reply' || t[3] === 'root');
            
            if (!isReply) return true; // Standalone, Repost, Quote always show

            // If it's a reply, only show if:
            // 1. In global feed, we generally hide replies to keep it clean
            if (authors.length === 0) return false;

            // 2. In following feed, show if it's a reply to someone the user follows
            const replyPTag = ev.tags.find(t => t[0] === 'p');
            if (replyPTag && authors.includes(replyPTag[1])) return true;
            
            // 3. Thread continuation (reply to self)
            if (replyPTag && replyPTag[1] === ev.pubkey) return true;

            return false;
          });
        }

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
  }, [ndk, isReady, authors, limit, kinds, disableFiltering]);

  // Initial subscription for real-time updates (top of the feed)
  useEffect(() => {
    if (!ndk || !isReady) return;

    const realtimeFilter: NDKFilter = {
      kinds: kinds,
      since: Math.floor(Date.now() / 1000),
    };

    if (authors && authors.length > 0) {
      realtimeFilter.authors = authors;
    }

    const sub = ndk.subscribe(
      realtimeFilter,
      { 
        closeOnEose: false,
        groupableDelay: 200,
        groupableDelayType: "at-most",
        onEvent: (event: NDKEvent) => {
          setPosts((prev) => {
            if (prev.find((p) => p.id === event.id)) return prev;
            
            // Filter based on Concept #5: Feed filtering (same as fetchFeed)
            let shouldInclude = true;
            if (!disableFiltering && kinds.includes(1)) {
              const eTags = event.tags.filter(t => t[0] === 'e');
              const isReply = eTags.some(t => t[3] === 'reply' || t[3] === 'root');
              
              if (isReply) {
                shouldInclude = false;
                // 1. Thread continuation (reply to self)
                const replyPTag = event.tags.find(t => t[0] === 'p');
                if (replyPTag && replyPTag[1] === event.pubkey) shouldInclude = true;
                // 2. Reply to someone followed
                if (replyPTag && authors.includes(replyPTag[1])) shouldInclude = true;
              }
            }

            if (!shouldInclude) return prev;

            const newPosts = [event, ...prev].sort(
              (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
            );
            return newPosts.slice(0, MAX_POSTS);
          });
        }
      }
    );
    realtimeSubRef.current = sub;

    return () => {
      if (realtimeSubRef.current) realtimeSubRef.current.stop();
    };
  }, [ndk, isReady, authors, kinds]);

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
