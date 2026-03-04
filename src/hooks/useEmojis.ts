"use client";

import { useEffect, useState, useMemo } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKKind } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";

export interface CustomEmoji {
  shortcode: string;
  url: string;
}

export function useEmojis() {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchEmojis = async () => {
      try {
        // Fetch Kind 10030 (User emoji list) and Kind 30030 (Emoji sets)
        const events = await ndk.fetchEvents(
          { 
            kinds: [10030 as NDKKind, 30030 as NDKKind], 
            authors: [user.pubkey] 
          },
          { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
        );

        const emojiMap = new Map<string, string>();

        events.forEach(event => {
          event.tags.forEach(tag => {
            if (tag[0] === "emoji" && tag[1] && tag[2]) {
              emojiMap.set(tag[1], tag[2]);
            }
          });
        });

        if (isMounted) {
          const emojiList = Array.from(emojiMap.entries()).map(([shortcode, url]) => ({
            shortcode,
            url
          }));
          setEmojis(emojiList);
        }
      } catch (err) {
        console.error("Error fetching emojis:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEmojis();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, user]);

  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    emojis.forEach(e => map.set(e.shortcode, e.url));
    return map;
  }, [emojis]);

  return { emojis, emojiMap, loading };
}
