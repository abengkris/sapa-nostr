import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NDKFilter, NDKUser, NDKRelaySet } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";

const SEARCH_RELAYS = ["wss://relay.nostr.band", "wss://search.nos.today", "wss://nos.lol"];

export function useSearch(query: string) {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [profiles, setProfiles] = useState<NDKUser[]>([]);
  const [directResult, setDirectResult] = useState<{
    user?: NDKUser;
    event?: NDKEvent;
  }>({});
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const performSearch = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady || !query || query.length < 3) {
      if (!isLoadMore) {
        setPosts([]);
        setProfiles([]);
        setDirectResult({});
      }
      return;
    }

    setLoading(true);

    try {
      const searchRelaySet = NDKRelaySet.fromRelayUrls(SEARCH_RELAYS, ndk);

      if (!isLoadMore) {
        setDirectResult({});
        
        // 0. Check if query is NIP-19, hex ID, or NIP-05
        const isHex = /^[0-9a-fA-F]{64}$/.test(query);
        const isNip19 = query.startsWith("npub") || query.startsWith("nprofile") || 
                        query.startsWith("note") || query.startsWith("nevent") || 
                        query.startsWith("naddr");
        const isNip05 = query.includes("@") || query.includes(".");

        if (isNip19 || isHex || isNip05) {
          // Try to fetch as a user first if it looks like a user ID or NIP-05
          if (query.startsWith("npub") || query.startsWith("nprofile") || isNip05 || (isHex && !query.startsWith("note"))) {
            try {
              const user = await ndk.fetchUser(query);
              if (user) {
                await user.fetchProfile();
                setDirectResult({ user });
              }
            } catch (e) {
              console.warn("Failed to fetch user direct result", e);
            }
          } 
          
          // If not a user result, or also check if it's an event
          if (!directResult.user && (query.startsWith("note") || query.startsWith("nevent") || query.startsWith("naddr") || isHex)) {
            try {
              const event = await ndk.fetchEvent(query);
              if (event) setDirectResult({ event });
            } catch (e) {
              console.warn("Failed to fetch event direct result", e);
            }
          }
        }

        // 1. Search Profiles (kind:0)
        const profileFilter: NDKFilter = {
          kinds: [0],
          search: query,
          limit: 15,
        };

        const profileEvents = await ndk.fetchEvents(profileFilter, undefined, searchRelaySet);
        const foundProfiles = Array.from(profileEvents).map((event) => {
          const user = ndk.getUser({ pubkey: event.pubkey });
          try {
            user.profile = JSON.parse(event.content);
          } catch (e) {
            // content might not be valid JSON
          }
          return user;
        });
        
        if (directResult.user) {
          const exists = foundProfiles.some(p => p.pubkey === directResult.user?.pubkey);
          if (!exists) foundProfiles.unshift(directResult.user);
        }

        setProfiles(foundProfiles);
      }

      // 2. Search Posts (kind:1) and Articles (kind:30023)
      let postFilter: NDKFilter;

      if (query.startsWith("#")) {
        // Hashtag search
        postFilter = {
          kinds: [1, 30023],
          "#t": [query.slice(1).toLowerCase()],
          limit: 20,
        };
      } else {
        // NIP-50 Full-text search using dedicated search relays
        postFilter = {
          kinds: [1, 30023],
          search: query,
          limit: 20,
        };
      }

      if (isLoadMore && oldestTimestampRef.current) {
        postFilter.until = oldestTimestampRef.current - 1;
      }

      const postEvents = await ndk.fetchEvents(postFilter, undefined, searchRelaySet);
      const newPostsList = Array.from(postEvents).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
      
      setPosts((prev) => {
        let combined = isLoadMore ? [...prev, ...newPostsList] : newPostsList;
        
        if (!isLoadMore && directResult.event) {
          const exists = combined.some(p => p.id === directResult.event?.id);
          if (!exists) combined = [directResult.event, ...combined];
        }

        const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
        
        if (unique.length > 0) {
          oldestTimestampRef.current = unique[unique.length - 1].created_at;
        }
        
        return unique;
      });

      setHasMore(postEvents.size >= 20);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, query, directResult.user, directResult.event]);

  useEffect(() => {
    setHasMore(true);
    oldestTimestampRef.current = undefined;
    const timeout = setTimeout(() => performSearch(), 500); // Debounce
    return () => clearTimeout(timeout);
  }, [query, performSearch]);

  const loadMore = () => {
    if (!loading && hasMore) {
      performSearch(true);
    }
  };

  return { posts, profiles, loading, loadMore, hasMore, directResult };
}
