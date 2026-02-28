"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostComposer } from "@/components/post/PostComposer";
import { PostCard } from "@/components/post/PostCard";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/lib/ndk";
import { useFeed } from "@/hooks/useFeed";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  const { isLoggedIn, user, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"following" | "global">("global");

  // Get following pubkeys from user contact list
  const [followingPubkeys, setFollowingPubkeys] = useState<string[]>([]);

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

  // Use following pubkeys for following tab, or empty array for global (useFeed handle all)
  const feedAuthors = activeTab === "following" ? followingPubkeys : [];
  const { posts, loading: feedLoading } = useFeed(feedAuthors);

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
        {feedLoading && posts.length === 0 ? (
          <div className="space-y-4 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-12 w-12" />
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
        
        {!feedLoading && posts.length > 0 && (
          <div className="p-4 text-center">
            <button className="text-blue-500 text-sm font-bold hover:underline">
              Load more...
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
