"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { rankEvents } from "@/lib/feed/scorer";
import { useScoringContext } from "./useScoringContext";
import { fetchFromAlgoRelay } from "@/lib/feed/algoRelay";

interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  isEnriching: boolean;   
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const { ndk, isReady } = useNDK();
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const networkActivityRef = useRef(
    new Map<string, { reactions: Set<string>; replies: Set<string> }>()
  );

  const scoringCtx = useScoringContext(viewerPubkey, followingList);

  useEffect(() => {
    if (!ndk || !isReady || !followingList.length) {
      if (isReady && !followingList.length) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    seenIds.current = new Set();
    isInitialLoadDone.current = false;

    const followsOfFollows = scoringCtx?.followsOfFollowsSet
      ? Array.from(scoringCtx.followsOfFollowsSet).slice(0, 200)
      : [];

    const authors = [...followingList, ...followsOfFollows];

    const sub = ndk.subscribe(
      { kinds: [1], authors, limit: 50 },
      { closeOnEose: false }
    );

    const rawBuffer: NDKEvent[] = [];

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      if (!isInitialLoadDone.current) {
        rawBuffer.push(event);
      } else {
        bufferRef.current = [event, ...bufferRef.current];
        setNewCount(bufferRef.current.length);
      }
    });

    sub.on("eose", () => {
      const ranked = scoringCtx
        ? rankEvents(rawBuffer, scoringCtx, networkActivityRef.current)
          .map(se => se.event)
        : rawBuffer.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

      setPosts(ranked);
      setIsLoading(false);

      setTimeout(() => {
        isInitialLoadDone.current = true;
      }, 1500);
    });

    return () => sub.stop();
  }, [ndk, isReady, followingList.join(","), scoringCtx]);

  useEffect(() => {
    if (!viewerPubkey || isLoading) return;

    setIsEnriching(true);
    fetchFromAlgoRelay(viewerPubkey, 30)
      .then(algoEvents => {
        if (!algoEvents.length) return;

        const newEvents = algoEvents.filter(e => !seenIds.current.has(e.id));
        newEvents.forEach(e => seenIds.current.add(e.id));

        if (!newEvents.length) return;

        setPosts(prev => {
          const combined = [...prev, ...newEvents];
          if (scoringCtx) {
            return rankEvents(combined, scoringCtx, networkActivityRef.current)
              .map(se => se.event);
          }
          return combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        });
      })
      .catch(() => {}) 
      .finally(() => setIsEnriching(false));
  }, [viewerPubkey, isLoading, scoringCtx]);

  useEffect(() => {
    if (!ndk || !isReady || !followingList.length) return;

    const activitySub = ndk.subscribe({
      kinds: [1, 7], 
      authors: followingList,
      since: Math.floor(Date.now() / 1000) - 24 * 3600, 
      limit: 200,
    });

    activitySub.on("event", (ev: NDKEvent) => {
      for (const tag of ev.tags) {
        if (tag[0] !== "e" || !tag[1]) continue;
        const targetId = tag[1];

        if (!networkActivityRef.current.has(targetId)) {
          networkActivityRef.current.set(targetId, {
            reactions: new Set(),
            replies: new Set(),
          });
        }

        const activity = networkActivityRef.current.get(targetId)!;
        if (ev.kind === 7) activity.reactions.add(ev.pubkey);
        if (ev.kind === 1) activity.replies.add(ev.pubkey);
      }
    });

    return () => activitySub.stop();
  }, [ndk, isReady, followingList.join(",")]);

  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    const toFlush = scoringCtx
      ? rankEvents(bufferRef.current, scoringCtx, networkActivityRef.current)
        .map(se => se.event)
      : bufferRef.current;

    setPosts(prev => {
      const combined = [...toFlush, ...prev].slice(0, 150); 
      return Array.from(new Map(combined.map(e => [e.id, e])).values());
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [scoringCtx]);

  const loadMore = useCallback(async () => {
    if (!ndk || !hasMore || posts.length === 0) return;
    const oldest = posts[posts.length - 1].created_at;

    const olderEvents = await ndk.fetchEvents({
      kinds: [1],
      authors: followingList,
      until: (oldest ?? 0) - 1,
      limit: 30,
    });

    const newEvents = Array.from(olderEvents).filter(
      e => !seenIds.current.has(e.id)
    );
    newEvents.forEach(e => seenIds.current.add(e.id));

    if (newEvents.length < 30) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...newEvents];
      return scoringCtx
        ? rankEvents(combined, scoringCtx, networkActivityRef.current)
          .map(se => se.event)
        : combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    });
  }, [ndk, posts, hasMore, followingList, scoringCtx]);

  return { posts, newCount, isLoading, isEnriching, flushNewPosts, loadMore, hasMore };
}
