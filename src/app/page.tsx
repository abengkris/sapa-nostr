"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostComposer } from "@/components/post/PostComposer";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Users, Globe } from "lucide-react";
import { FeedList } from "@/components/feed/FeedList";
import { NewPostsIsland } from "@/components/feed/NewPostsIsland";
import { usePausedFeed } from "@/hooks/usePausedFeed";
import { useForYouFeed } from "@/hooks/useForYouFeed";

type FeedTab = "following" | "forYou" | "global";

export default function HomePage() {
  const { isLoggedIn, user, isLoading: isAuthLoading, _hasHydrated } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");

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

  if (!isLoggedIn || !user) return null;

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="flex px-4 py-3">
          <h1 className="text-xl font-bold">Home</h1>
        </div>
        
        <div className="flex w-full" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "forYou"}
            onClick={() => setActiveTab("forYou")}
            className={`flex-1 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative ${
              activeTab === "forYou" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Sparkles size={16} />
              <span>For You</span>
            </div>
            {activeTab === "forYou" && (
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

          <button
            role="tab"
            aria-selected={activeTab === "global"}
            onClick={() => setActiveTab("global")}
            className={`flex-1 py-4 text-sm font-bold transition-colors hover:bg-gray-100 dark:hover:bg-gray-900 relative ${
              activeTab === "global" ? "text-blue-500" : "text-gray-500"
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Globe size={16} />
              <span>Global</span>
            </div>
            {activeTab === "global" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      <PostComposer />

      <div className="pb-20">
        {activeTab === "forYou" ? (
          <ForYouFeedTab 
            viewerPubkey={user.pubkey} 
            followingList={followingPubkeys} 
          />
        ) : activeTab === "following" ? (
          <FollowingFeedTab 
            followingList={followingPubkeys} 
            viewerPubkey={user.pubkey}
          />
        ) : (
          <GlobalFeedTab />
        )}
      </div>
    </MainLayout>
  );
}

function ForYouFeedTab({ viewerPubkey, followingList }: { viewerPubkey: string; followingList: string[] }) {
  const { posts, newCount, isLoading, wotStatus, wotSize, flushNewPosts, loadMore, hasMore } = 
    useForYouFeed({ viewerPubkey, followingList });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      
      <WoTStatusBanner status={wotStatus} size={wotSize} />

      <FeedList 
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Looking for something for you… Try following more people!"
      />
    </div>
  );
}

function WoTStatusBanner({
  status,
  size,
}: {
  status: "idle" | "loading" | "ready" | "error";
  size: number;
}) {
  if (status === "ready") {
    if (size <= 1) {
      return (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50/30 dark:bg-amber-900/5 text-[10px] text-amber-600 dark:text-amber-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
          <span>💡 Tip: Follow more people to build your Web of Trust</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/30 dark:bg-blue-900/5 text-[10px] text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span>Web of Trust active · {size.toLocaleString()} users in your network</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/30 dark:bg-blue-900/5 text-[10px] text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        <span>Building Web of Trust…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-50/30 dark:bg-red-900/5 text-[10px] text-red-600 dark:text-red-400 border-b border-gray-100 dark:border-gray-900 font-bold uppercase tracking-widest">
        <span>⚠️ WoT failed to load — showing following feed only</span>
      </div>
    );
  }

  return null;
}

function FollowingFeedTab({ followingList, viewerPubkey }: { followingList: string[]; viewerPubkey: string }) {
  const authors = followingList.length > 0 ? followingList : [viewerPubkey];
  
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    usePausedFeed({
      filter: {
        kinds: [1],
        authors,
      },
    });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      <FeedList 
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Try following some people to see their posts here!" 
      />
    </div>
  );
}

function GlobalFeedTab() {
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    usePausedFeed({
      filter: {
        kinds: [1],
      },
    });

  const handleFlush = useCallback(() => {
    flushNewPosts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [flushNewPosts]);

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={handleFlush} />
      <FeedList 
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="The global feed is empty? That's impossible!" 
      />
    </div>
  );
}
