"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Loader2, User as UserIcon } from "lucide-react";
import { useNDK } from "@/hooks/useNDK";
import { useSearch } from "@/hooks/useSearch";
import { useDebounce } from "use-debounce";
import { PostCard } from "@/components/post/PostCard";
import Link from "next/link";
import Image from "next/image";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

export default function SearchPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery] = useDebounce(searchInput, 300);
  const { ndk, isReady } = useNDK();
  const { posts, profiles, loading, loadMore, hasMore } = useSearch(debouncedQuery);

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <label htmlFor="search-input" className="sr-only">Search people, hashtags, or content</label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            id="search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search people, hashtags, or content..."
            className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-full bg-gray-100 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-0">
        {loading && profiles.length === 0 && posts.length === 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-4" />
            <div className="flex overflow-x-auto pb-4 space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center min-w-[100px] animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 mb-2" />
                  <div className="h-3 w-16 bg-gray-100 dark:bg-gray-900 rounded mb-1" />
                  <div className="h-2 w-12 bg-gray-50 dark:bg-black rounded" />
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && posts.length === 0 && (
          <FeedSkeleton />
        )}

        {!loading && debouncedQuery && profiles.length > 0 && (
          <section className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4">People</h2>
            <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
              {profiles.map((user) => (
                <Link
                  key={user.pubkey}
                  href={`/${user.npub}`}
                  className="flex flex-col items-center min-w-[100px] p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-center"
                >
                  <Image
                    src={user.profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.pubkey}`}
                    alt={user.profile?.name || "Profile"}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover mb-2 bg-gray-200"
                    unoptimized={true}
                  />
                  <p className="font-bold text-sm truncate w-24">
                    {user.profile?.name || `${user.npub.slice(0, 8)}…`}
                  </p>
                  <p className="text-xs text-gray-500 truncate w-24">
                    {user.profile?.nip05 || `${user.npub.slice(-8)}`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {posts.length > 0 && (
          <section className="pb-20">
            <h2 className="text-xl font-bold p-4 border-b border-gray-200 dark:border-gray-800">Posts</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {posts.map((post) => (
                <PostCard key={post.id} event={post} />
              ))}
            </div>
            {hasMore && (
              <div className="p-8 text-center border-t border-gray-100 dark:border-gray-900">
                <button 
                  onClick={() => loadMore()}
                  disabled={loading}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-blue-500 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </span>
                  ) : "Show more results"}
                </button>
              </div>
            )}
          </section>
        )}

        {!loading && debouncedQuery && profiles.length === 0 && posts.length === 0 && (
          <div className="text-center p-12 text-gray-500">
            No results found for "{debouncedQuery}". Try searching for something else!
          </div>
        )}

        {!debouncedQuery && !loading && (
          <div className="p-12 text-center text-gray-500">
            <Search className="mx-auto mb-4 opacity-20" size={64} />
            <p className="text-xl font-medium">Search the Nostr network</p>
            <p className="text-sm mt-2">Try searching for #nostr, #bitcoin, or a name.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
