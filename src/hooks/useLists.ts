"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKEvent, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";

export enum ListKind {
  Mute = 10000,
  Pinned = 10001,
  Relay = 10002,
  Bookmarks = 10003,
  Interests = 10015,
  Emojis = 10030,
}

export function useLists() {
  const { ndk, isReady } = useNDK();
  const { user } = useAuthStore();
  
  const [mutedPubkeys, setMutedPubkeys] = useState<Set<string>>(new Set());
  const [bookmarkedEventIds, setBookmarkedEventIds] = useState<Set<string>>(new Set());
  const [pinnedEventIds, setPinnedEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Cache latest events to avoid redundant fetches and clobbering
  const listEventsRef = useRef<Map<number, NDKEvent>>(new Map());

  const fetchLists = useCallback(async () => {
    if (!ndk || !isReady || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch common NIP-51 lists
      const kinds = [ListKind.Mute, ListKind.Pinned, ListKind.Bookmarks] as number[];
      const events = await ndk.fetchEvents(
        { kinds, authors: [user.pubkey] },
        { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }
      );

      const newMuted = new Set<string>();
      const newBookmarks = new Set<string>();
      const newPinned = new Set<string>();

      // Group events by kind and find latest for each
      const latestByKind = new Map<number, NDKEvent>();
      events.forEach(event => {
        const existing = latestByKind.get(event.kind!);
        if (!existing || (event.created_at ?? 0) > (existing.created_at ?? 0)) {
          latestByKind.set(event.kind!, event);
        }
      });

      // Update ref
      latestByKind.forEach((event, kind) => {
        listEventsRef.current.set(kind, event);
        
        if (kind === ListKind.Mute) {
          event.tags.filter(t => t[0] === 'p').forEach(t => newMuted.add(t[1]));
        } else if (kind === ListKind.Bookmarks) {
          event.tags.filter(t => t[0] === 'e' || t[0] === 'a').forEach(t => newBookmarks.add(t[1]));
        } else if (kind === ListKind.Pinned) {
          event.tags.filter(t => t[0] === 'e').forEach(t => newPinned.add(t[1]));
        }
      });

      setMutedPubkeys(newMuted);
      setBookmarkedEventIds(newBookmarks);
      setPinnedEventIds(newPinned);
    } catch (err) {
      console.error("Error fetching NIP-51 lists:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, user]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const updateList = useCallback(async (
    kind: ListKind, 
    tagType: string, 
    value: string, 
    action: 'add' | 'remove',
    extraTags: string[] = []
  ) => {
    if (!ndk || !user) return false;

    try {
      // 1. Fetch ALL versions from relays to find the TRULY latest (Safety logic from follow fix)
      const events = await ndk.fetchEvents(
        { kinds: [kind as number], authors: [user.pubkey] },
        { 
          cacheUsage: NDKSubscriptionCacheUsage.ONLY_RELAY,
          closeOnEose: true
        }
      );

      const currentEvent = Array.from(events).sort(
        (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
      )[0];

      const newEvent = new NDKEvent(ndk);
      newEvent.kind = kind;
      newEvent.tags = currentEvent ? [...currentEvent.tags] : [];

      if (action === 'add') {
        const exists = newEvent.tags.some(t => t[0] === tagType && t[1] === value);
        if (!exists) {
          newEvent.tags.push([tagType, value, ...extraTags]);
        } else {
          return true; // Already exists
        }
      } else {
        newEvent.tags = newEvent.tags.filter(t => !(t[0] === tagType && t[1] === value));
      }

      await newEvent.sign();
      await newEvent.publish();
      
      // Update cache
      listEventsRef.current.set(kind, newEvent);

      // Update local state
      if (kind === ListKind.Mute) {
        setMutedPubkeys(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.Bookmarks) {
        setBookmarkedEventIds(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      } else if (kind === ListKind.Pinned) {
        setPinnedEventIds(prev => {
          const next = new Set(prev);
          action === 'add' ? next.add(value) : next.delete(value);
          return next;
        });
      }

      return true;
    } catch (err) {
      console.error(`Failed to update NIP-51 list ${kind}:`, err);
      return false;
    }
  }, [ndk, user]);

  return {
    mutedPubkeys,
    bookmarkedEventIds,
    pinnedEventIds,
    loading,
    refresh: fetchLists,
    
    // Muting
    muteUser: (pubkey: string) => updateList(ListKind.Mute, 'p', pubkey, 'add'),
    unmuteUser: (pubkey: string) => updateList(ListKind.Mute, 'p', pubkey, 'remove'),
    
    // Bookmarking
    bookmarkPost: (eventId: string) => updateList(ListKind.Bookmarks, 'e', eventId, 'add'),
    unbookmarkPost: (eventId: string) => updateList(ListKind.Bookmarks, 'e', eventId, 'remove'),
    
    // Pinning
    pinPost: (eventId: string) => updateList(ListKind.Pinned, 'e', eventId, 'add'),
    unpinPost: (eventId: string) => updateList(ListKind.Pinned, 'e', eventId, 'remove'),
    isPinned: (eventId: string) => pinnedEventIds.has(eventId),
    isBookmarked: (eventId: string) => bookmarkedEventIds.has(eventId),
    isMuted: (pubkey: string) => mutedPubkeys.has(pubkey),
  };
}
