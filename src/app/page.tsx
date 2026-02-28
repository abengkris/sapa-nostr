"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostComposer } from "@/components/post/PostComposer";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { NDKFilter } from "@nostr-dev-kit/ndk";

export default function HomePage() {
  const { isLoggedIn, user, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"following" | "global">("global");

  const [followingPubkeys, setFollowingPubkeys] = useState<string[]>([]);

  useEffect(() => {
    if (isReady && isLoggedIn && user) {
      ndk?.fetchEvent({ kinds: [3], authors: [user.pubkey] }).then((event) => {
        if (event) {
          const pubkeys = event.tags
            .filter((t) => t[0] === "p")
            .map((t) => t[1]);
          setFollowingPubkeys(pubkeys);
        }
      });
    }
  }, [ndk, isReady, isLoggedIn, user]);

  const filter = useMemo((): NDKFilter => {
    if (activeTab === "global") {
      return { kinds: [1] };
    }
    // For following tab, if we don't have following list yet, use user's own pubkey as placeholder
    const authors = followingPubkeys.length > 0 ? followingPubkeys : (user ? [user.pubkey] : []);
    return { kinds: [1], authors };
  }, [activeTab, followingPubkeys, user]);

  // Protected route check
  useEffect(() => {
    if (_hasHydrated && !isAuthLoading && !isLoggedIn) {
      router.push("/login");
    }
  }, [isLoggedIn, isAuthLoading, _hasHydrated, router]);

  if (!_hasHydrated || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex px-4 py-3">
          <h1 className="text-xl font-bold">Home</h1>
        </div>
        
        <div className="flex w-full" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "global"}
            onClick={() => setActiveTab("global")}
            className={`flex-1 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative ${
              activeTab === "global" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles size={16} />
              <span>Global</span>
            </div>
            {activeTab === "global" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
          
          <button
            role="tab"
            aria-selected={activeTab === "following"}
            onClick={() => setActiveTab("following")}
            className={`flex-1 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative ${
              activeTab === "following" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users size={16} />
              <span>Following</span>
            </div>
            {activeTab === "following" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <PostComposer />

      <div className="pb-20">
        <FeedList 
          key={activeTab} 
          filter={filter} 
          emptyMessage={
            activeTab === "following" 
              ? "Try following some people to see their posts here!" 
              : "Nothing to see here yet."
          }
        />
      </div>
    </MainLayout>
  );
}
