import { useEffect, useState, useCallback } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage, NDKUser, NDKKind } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";

export function useLists() {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  const [mutedPubkeys, setMutedPubkeys] = useState<Set<string>>(new Set());
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch lists
  useEffect(() => {
    if (!ndk || !isReady || !user) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchLists = async () => {
      try {
        // Fetch Mute List (10000) and Bookmarks (10003)
        const events = await ndk.fetchEvents(
          { kinds: [10000, 10003], authors: [user.pubkey] },
          { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
        );

        if (!isMounted) return;

        const newMuted = new Set<string>();
        const newBookmarks = new Set<string>();

        events.forEach(event => {
          if (event.kind === 10000) {
            event.tags.forEach(t => {
              if (t[0] === 'p') newMuted.add(t[1]);
            });
          } else if (event.kind === 10003) {
            event.tags.forEach(t => {
              if (t[0] === 'e') newBookmarks.add(t[1]);
            });
          }
        });

        setMutedPubkeys(newMuted);
        setBookmarkedEventIds(newBookmarks);
      } catch (err) {
        console.error("Error fetching lists:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLists();

    return () => { isMounted = false; };
  }, [ndk, isReady, user]);

  // Helper to update a list
  const updateList = useCallback(async (kind: number, tagType: string, value: string, action: 'add' | 'remove') => {
    if (!ndk || !user) return false;

    try {
      // 1. Fetch latest version from relay to avoid overwriting
      const currentEvent = await ndk.fetchEvent(
        { kinds: [kind], authors: [user.pubkey] },
        { cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY }
      );

      const event = new NDKEvent(ndk);
      event.kind = kind;
      // If event exists, copy tags. If not, start empty.
      event.tags = currentEvent ? [...currentEvent.tags] : [];

      if (action === 'add') {
        // Check if already exists
        const exists = event.tags.some(t => t[0] === tagType && t[1] === value);
        if (!exists) {
          event.tags.push([tagType, value]);
        } else {
            return true; // Already added, no-op success
        }
      } else {
        event.tags = event.tags.filter(t => !(t[0] === tagType && t[1] === value));
      }

      await event.publish();
      
      // Update local state optimistic-ish
      if (kind === 10000) {
        setMutedPubkeys(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === 10003) {
        setBookmarkedEventIds(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      }

      return true;
    } catch (err) {
      console.error(`Failed to update list ${kind}:`, err);
      return false;
    }
  }, [ndk, user]);

  return {
    mutedPubkeys,
    bookmarkedEventIds,
    loading,
    muteUser: (pubkey: string) => updateList(10000, 'p', pubkey, 'add'),
    unmuteUser: (pubkey: string) => updateList(10000, 'p', pubkey, 'remove'),
    bookmarkPost: (eventId: string) => updateList(10003, 'e', eventId, 'add'),
    unbookmarkPost: (eventId: string) => updateList(10003, 'e', eventId, 'remove'),
  };
}
