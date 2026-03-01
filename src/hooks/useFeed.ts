import { useEffect, useState, useRef, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useLists } from "@/hooks/useLists";

const MAX_POSTS = 100;

export function useFeed(authors: string[], kinds: number[] = [1], disableFiltering: boolean = false) {
  const { ndk, isReady } = useNDK();
  const { mutedPubkeys } = useLists();
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
    const fetchLimit = authors.length === 0 ? 50 : limit;

    const filter: NDKFilter = {
      kinds: kinds,
      limit: fetchLimit,
    };

    if (authors && authors.length > 0) {
      filter.authors = authors;
    }

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    if (subscriptionRef.current) subscriptionRef.current.stop();

    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10s safety timeout

    let eventsReceived = 0;
    const sub = ndk.subscribe(
      filter, 
      { 
        closeOnEose: true,
        onEvent: (event: NDKEvent) => {
          clearTimeout(loadingTimeout);
          eventsReceived++;

          // NIP-51: Mute List Filtering
          if (mutedPubkeys.has(event.pubkey)) return;

          setPosts((prev) => {
            if (prev.find((p) => p.id === event.id)) return prev;
            
            const newPosts = [...prev, event].sort(
              (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
            );

            // Filter logic
            let filteredPosts = newPosts;
            if (!disableFiltering && kinds.includes(1)) {
              filteredPosts = newPosts.filter(ev => {
                // Determine if it's a reply using NIP-10 tags or simple check
                const eTags = ev.tags.filter(t => t[0] === 'e');
                if (eTags.length === 0) return true;

                // If it has e tags, check if it's explicitly marked as reply or if it's just a root thread
                const isReply = eTags.some(t => t[3] === 'reply' || t[3] === 'root');
                if (!isReply && eTags.length > 0) {
                  // If it's Kind 1 but has e tags without markers, 
                  // it's likely an old-style reply or a quote.
                  // For profile feeds, we usually only want the author's root posts.
                  if (authors.length > 0) {
                     // Only include if it's a mention/quote, but standard Nostr 
                     // profile feeds usually separate these into a 'Replies' tab.
                     return false;
                  }
                }
                
                if (isReply) {
                  // Global feed: show replies to provide activity
                  if (authors.length === 0) return true;

                  // Profile feed: show reply only if it's to someone in authors (or self)
                  const replyPTag = ev.tags.find(t => t[0] === 'p');
                  if (replyPTag && authors.includes(replyPTag[1])) return true;
                  if (replyPTag && replyPTag[1] === ev.pubkey) return true;

                  return false;
                }

                return true;
              });
            }

            // Slice AFTER filtering to ensure we have enough content
            const slicedPosts = filteredPosts.slice(0, MAX_POSTS);
            
            // Update oldest timestamp based on the last post in the FULL list
            // to ensure next page fetch works correctly even if current page is heavily filtered
            const lastPost = newPosts[newPosts.length - 1];
            if (lastPost?.created_at) {
              oldestTimestampRef.current = lastPost.created_at;
            }

            return slicedPosts;
          });
        },
        onEose: () => {
          clearTimeout(loadingTimeout);
          setLoading(false);
          // If we received fewer events than the limit, we probably reached the end
          if (eventsReceived < fetchLimit) {
            setHasMore(false);
          }
        }
      }
    );
    subscriptionRef.current = sub;
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
          // NIP-51: Mute List Filtering
          if (mutedPubkeys.has(event.pubkey)) return;

          setPosts((prev) => {
            if (prev.find((p) => p.id === event.id)) return prev;
            
            let shouldInclude = true;
            if (!disableFiltering && kinds.includes(1)) {
              const eTags = event.tags.filter(t => t[0] === 'e');
              const isReply = eTags.some(t => t[3] === 'reply' || t[3] === 'root');
              
              if (isReply) {
                shouldInclude = false;
                // Global feed: show replies
                if (authors.length === 0) shouldInclude = true;
                
                const replyPTag = event.tags.find(t => t[0] === 'p');
                if (replyPTag && replyPTag[1] === event.pubkey) shouldInclude = true;
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
  }, [ndk, isReady, authors, kinds, disableFiltering]);

  // Initial fetch and global cleanup
  useEffect(() => {
    setPosts([]);
    setHasMore(true);
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
