// src/hooks/useFollowingList.ts
"use client";

import { useState, useEffect } from "react";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";

interface UseFollowingListReturn {
  following: string[];      // array pubkey
  followingUsers: NDKUser[]; // dengan profile (lazy)
  count: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useFollowingList(
  pubkey: string | undefined
): UseFollowingListReturn {
  const [following, setFollowing] = useState<string[]>([]);
  const [followingUsers, setFollowingUsers] = useState<NDKUser[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!pubkey) return;
    setLoading(true);
    try {
      const ndk = getNDK();
      const user = ndk.getUser({ pubkey });

      // NDKUser.follows() fetch kind:3 dan parse p-tags
      const followSet: Set<NDKUser> = await user.follows();
      const pubkeys = Array.from(followSet).map((u) => u.pubkey);

      setFollowing(pubkeys);
      setFollowingUsers(Array.from(followSet));
    } catch (err) {
      console.error("useFollowingList error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [pubkey]);

  return {
    following,
    followingUsers,
    count: following.length,
    loading,
    refresh: load,
  };
}
