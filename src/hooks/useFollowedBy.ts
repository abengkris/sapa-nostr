"use client";

import { useState, useEffect, useMemo } from "react";
import { NDKEvent, NDKUser, NDKSubscriptionCacheUsage } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useFollowingList } from "@/hooks/useFollowingList";

interface UseFollowedByReturn {
  followedBy: NDKUser[];
  count: number;
  loading: boolean;
}

/**
 * Finds which of the current user's follows also follow the targetPubkey.
 * (WoT Depth 2 intersection)
 */
export function useFollowedBy(targetPubkey: string | undefined): UseFollowedByReturn {
  const { ndk, isReady } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { following: myFollowing, loading: followingLoading } = useFollowingList(currentUser?.pubkey);
  
  const [followedBy, setFollowedBy] = useState<NDKUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !isReady || !targetPubkey || !currentUser || myFollowing.length === 0) {
      setFollowedBy([]);
      return;
    }

    // Don't show "Followed by you" in this context usually, 
    // but we want to see who ELSE follows them.
    if (targetPubkey === currentUser.pubkey) {
      setFollowedBy([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchMutuals = async () => {
      try {
        // Query: Find kind:3 events authored by people I follow 
        // that contain a p-tag for the targetPubkey.
        const events = await ndk.fetchEvents({
          kinds: [3],
          authors: myFollowing,
          "#p": [targetPubkey]
        }, { cacheUsage: NDKSubscriptionCacheUsage.CACHE_FIRST }); // Prefer cache then relay

        if (!isMounted) return;

        const mutualPubkeys = Array.from(events).map(e => e.pubkey);
        const uniqueMutuals = Array.from(new Set(mutualPubkeys));
        
        // Convert to NDKUser objects
        const users = uniqueMutuals.map(pk => ndk.getUser({ pubkey: pk }));
        
        // Optionally fetch profiles for the first few
        // For now, we just return the user objects
        setFollowedBy(users);
      } catch (err) {
        console.error("Error fetching followedBy:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMutuals();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, targetPubkey, currentUser?.pubkey, myFollowing]);

  return { 
    followedBy, 
    count: followedBy.length, 
    loading: loading || followingLoading 
  };
}
