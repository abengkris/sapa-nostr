import { useState, useEffect, useCallback } from "react";
import { NDKEvent, NDKFilter, NDKUser } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";

export function useSearch(query: string) {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [profiles, setProfiles] = useState<NDKUser[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback(async () => {
    if (!ndk || !isReady || !query || query.length < 3) {
      setPosts([]);
      setProfiles([]);
      return;
    }

    setLoading(true);

    try {
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

      const postEvents = await ndk.fetchEvents(postFilter);
      setPosts(Array.from(postEvents).sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)));
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, query]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  return { posts, profiles, loading };
}
