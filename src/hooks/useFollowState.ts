// src/hooks/useFollowState.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { getNDK } from "@/lib/ndk";
import { followUser, unfollowUser } from "@/lib/actions/follow";
import { useAuthStore } from "@/store/auth";

interface UseFollowStateReturn {
  isFollowing: boolean;
  isLoading: boolean;  // true saat sedang follow/unfollow
  isPending: boolean;  // optimistic update sedang berlangsung
  toggle: () => Promise<void>;
}

export function useFollowState(targetPubkey: string): UseFollowStateReturn {
  const user = useAuthStore((s) => s.user);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  // Cek initial state dari kind:3 viewer
  useEffect(() => {
    if (!user?.pubkey || !targetPubkey) {
      setIsLoading(false);
      return;
    }

    const ndk = getNDK();
    ndk
      .fetchEvent({ kinds: [3], authors: [user.pubkey] })
      .then((contactList) => {
        if (!contactList) {
          setIsFollowing(false);
          return;
        }
        const following = contactList.tags.some(
          (t) => t[0] === "p" && t[1] === targetPubkey
        );
        setIsFollowing(following);
      })
      .finally(() => setIsLoading(false));
  }, [user?.pubkey, targetPubkey]);

  const toggle = useCallback(async () => {
    if (!user || isPending) return;

    // Optimistic update: ubah UI dulu
    const prevState = isFollowing;
    setIsFollowing(!prevState);
    setIsPending(true);

    try {
      const result = prevState
        ? await unfollowUser(targetPubkey)
        : await followUser(targetPubkey);

      if (!result.success) {
        // Rollback jika gagal
        setIsFollowing(prevState);
        console.error("Follow/unfollow gagal:", result.error);
      }
    } catch {
      // Rollback
      setIsFollowing(prevState);
    } finally {
      setIsPending(false);
    }
  }, [user, targetPubkey, isFollowing, isPending]);

  return { isFollowing, isLoading, isPending, toggle };
}
