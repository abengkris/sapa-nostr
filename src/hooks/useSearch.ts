import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKFilter, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";

export function useSearch(query: string) {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [profiles, setProfiles] = useState<NDKUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const performSearch = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady || !query || query.length < 3) {
      setPosts([]);
      setProfiles([]);
      return;
    }

    setLoading(true);

    try {
      if (!isLoadMore) {
        // 1. Search Profiles (kind:0)
        const profileFilter: NDKFilter = {
          kinds: [0],
          search: query,
          limit: 10,
        };

        const profileEvents = await ndk.fetchEvents(profileFilter);
        const foundProfiles = Array.from(profileEvents).map((event) => {
          const user = ndk.getUser({ pubkey: event.pubkey });
          try {
            user.profile = JSON.parse(event.content);
          } catch (e) {
            console.error("Failed to parse kind:0 content", e);
          }
          return user;
        });
        setProfiles(foundProfiles);
      }

      // 2. Search Posts (kind:1)
      let postFilter: NDKFilter;

      if (query.startsWith("#")) {
        // Hashtag search
        postFilter = {
          kinds: [1],
          "#t": [query.slice(1).toLowerCase()],
          limit: 20,
        };
      } else {
        // NIP-50 Full-text search
        postFilter = {
          kinds: [1],
          search: query,
          limit: 20,
        };
      }

      if (isLoadMore && oldestTimestampRef.current) {
        postFilter.until = oldestTimestampRef.current - 1;
      }

      const postEvents = await ndk.fetchEvents(postFilter);
      const newPostsList = Array.from(postEvents).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      
      setPosts((prev) => {
        const combined = isLoadMore ? [...prev, ...newPostsList] : newPostsList;
        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        if (unique.length > 0) {
          oldestTimestampRef.current = unique[unique.length - 1].created_at;
        }
        
        return unique;
      });

      if (postEvents.size < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, query]);

  useEffect(() => {
    setHasMore(true);
    oldestTimestampRef.current = undefined;
    performSearch();
  }, [query, performSearch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(true);
    }
  };

  return { posts, profiles, loading, loadMore, hasMore };
}
