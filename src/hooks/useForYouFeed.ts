"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";
import { useWoT } from "./useWoT";

interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  wotStatus: "idle" | "loading" | "ready" | "error";
  wotSize: number;            
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const { ndk, isReady } = useNDK();
  const { wot, status: wotStatus, pubkeyCount: wotSize } = useWoT(viewerPubkey);

  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);

  useEffect(() => {
    if (!ndk || !isReady || wotStatus === "idle") return;

    setIsLoading(true);
    seenIds.current = new Set();
    isInitialLoadDone.current = false;
    bufferRef.current = [];
    setPosts([]);

    const authors = wot
      ? wot.getAllPubkeys({ maxDepth: 2 }).slice(0, 500)
      : followingList;

    if (!authors.length) {
      setIsLoading(false);
      return;
    }

    const sub = ndk.subscribe(
      {
        kinds: [1],
        authors,
        limit: 30,
      },
      {
        closeOnEose: false,
      }
    );

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      if (!isInitialLoadDone.current) {
        setPosts(prev => {
          const next = [...prev, event];
          return wot ? rankByWoT(next, wot) : sortByTime(next);
        });
      } else {
        bufferRef.current = [event, ...bufferRef.current];
        setNewCount(bufferRef.current.length);
      }
    });

    sub.on("eose", () => {
      setIsLoading(false);
      if (wot) {
        setPosts(prev => rankByWoT(prev, wot));
      }
      setTimeout(() => {
        isInitialLoadDone.current = true;
      }, 1500);
    });

    return () => sub.stop();
  }, [ndk, isReady, wotStatus, followingList.join(",")]);

  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    setPosts(prev => {
      const combined = [...bufferRef.current, ...prev].slice(0, 150);
      const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
      return wot ? rankByWoT(unique, wot) : sortByTime(unique);
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [wot]);

  const loadMore = useCallback(async () => {
    if (!ndk || !hasMore || !posts.length) return;

    const oldest = Math.min(...posts.map(p => p.created_at ?? Infinity));
    const authors = wot ? wot.getAllPubkeys({ maxDepth: 2 }).slice(0, 500) : followingList;

    const older = await ndk.fetchEvents({
      kinds: [1],
      authors,
      until: oldest - 1,
      limit: 30,
    });

    const newEvents = Array.from(older).filter(e => !seenIds.current.has(e.id));
    newEvents.forEach(e => seenIds.current.add(e.id));
    if (newEvents.length < 30) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...newEvents];
      const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
      return wot ? rankByWoT(unique, wot) : sortByTime(unique);
    });
  }, [ndk, posts, hasMore, followingList, wot]);

  return {
    posts,
    newCount,
    isLoading,
    wotStatus,
    wotSize,
    flushNewPosts,
    loadMore,
    hasMore,
  };
}

function rankByWoT(events: NDKEvent[], wot: NDKWoT): NDKEvent[] {
  const now = Date.now() / 1000;

  return [...events].sort((a, b) => {
    const scoreA = computeFinalScore(a, wot, now);
    const scoreB = computeFinalScore(b, wot, now);
    return scoreB - scoreA;
  });
}

function computeFinalScore(event: NDKEvent, wot: NDKWoT, now: number): number {
  const wotScore = wot.getScore(event.pubkey) ?? 0;

  const ageHours = (now - (event.created_at ?? 0)) / 3600;
  let freshness: number;
  if (ageHours < 1) freshness = 1.0;
  else if (ageHours < 6) freshness = 0.85;
  else if (ageHours < 24) freshness = 0.6;
  else freshness = 0.3;

  return wotScore * freshness;
}

function sortByTime(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}
