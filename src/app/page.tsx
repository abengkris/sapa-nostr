"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostComposer } from "@/components/post/PostComposer";
import { PostCard } from "@/components/post/PostCard";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/lib/ndk";
import { useFeed } from "@/hooks/useFeed";
import { useWoT } from "@/hooks/useWoT";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";

import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

export default function HomePage() {
  const { isLoggedIn, user, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"following" | "global">("global");

  // Get following pubkeys from user contact list (Depth 1)
  const [followingPubkeys, setFollowingPubkeys] = useState<string[]>([]);

  // Get Web of Trust pubkeys (Depth 2)
  const { wotPubkeys, loading: wotLoading } = useWoT(user?.pubkey, 2);

  useEffect(() => {
    if (isReady && isLoggedIn && user) {
      // Fetch user's following list (kind:3)
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

  // Determine which authors to show based on active tab
  // Global tab now shows WoT Depth 2
  const feedAuthors = activeTab === "following" 
    ? followingPubkeys 
    : (wotPubkeys.length > 0 ? wotPubkeys : []);
    
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed(feedAuthors);

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
        
        <div className="flex w-full">
          <button
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
        {(feedLoading || (activeTab === 'global' && wotLoading && posts.length === 0)) && posts.length === 0 ? (
          <FeedSkeleton />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} event={post} />
          ))
        )}

        {posts.length === 0 && !feedLoading && (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium">Nothing to see here yet.</p>
            {activeTab === "following" && (
              <p className="text-sm mt-2">Try following some people or check the Global tab!</p>
            )}
          </div>
        )}
        
        {hasMore && posts.length > 0 && (
          <div className="p-8 text-center">
            <button 
              onClick={() => loadMore()}
              disabled={feedLoading}
              className="text-blue-500 text-sm font-bold hover:underline disabled:opacity-50"
            >
              {feedLoading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
