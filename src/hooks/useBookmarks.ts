import { useEffect, useState } from "react";
import { NDKEvent, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useLists } from "@/hooks/useLists";

export function useBookmarks() {
  const { ndk, isReady } = useNDK();
  const { bookmarkedEventIds, loading: listsLoading } = useLists();
  const [bookmarkedEvents, setBookmarkedEvents] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || listsLoading) {
      return;
    }

    if (bookmarkedEventIds.size === 0) {
      setBookmarkedEvents([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchBookmarkedEvents = async () => {
      try {
        const ids = Array.from(bookmarkedEventIds);
        const events = await ndk.fetchEvents(
          { ids },
          { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
        );

        if (isMounted) {
          // Sort by created_at descending
          const sorted = Array.from(events).sort(
            (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
          );
          setBookmarkedEvents(sorted);
        }
      } catch (err) {
        console.error("Error fetching bookmarked events:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBookmarkedEvents();

    return () => { isMounted = false; };
  }, [ndk, isReady, bookmarkedEventIds, listsLoading]);

  return { events: bookmarkedEvents, loading };
}
