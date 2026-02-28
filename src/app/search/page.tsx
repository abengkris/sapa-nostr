"use client";

import React, { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Search, Loader2, User as UserIcon } from "lucide-react";
import { useNDK } from "@/lib/ndk";
import { useSearch } from "@/hooks/useSearch";
import { useDebounce } from "use-debounce";
import { PostCard } from "@/components/post/PostCard";
import Link from "next/link";
import Image from "next/image";

export default function SearchPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery] = useDebounce(searchInput, 300);
  const { ndk, isReady } = useNDK();
  const { posts, profiles, loading } = useSearch(debouncedQuery);

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search people, hashtags, or content..."
            className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-full bg-gray-100 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="p-0">
        {loading && (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}

        {!loading && debouncedQuery && profiles.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-4">People</h2>
            <div className="flex overflow-x-auto pb-4 space-x-4 text-center">
              {profiles.map((user) => (
                <Link
                  key={user.pubkey}
                  href={`/${user.pubkey}`}
                  className="flex flex-col items-center min-w-[100px] p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
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
                    {user.profile?.name || `${user.pubkey.slice(0, 8)}...`}
                  </p>
                  <p className="text-xs text-gray-500 truncate w-24">
                    {user.profile?.nip05 || ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && debouncedQuery && posts.length > 0 && (
          <div className="pb-20">
            <h2 className="text-xl font-bold p-4 border-b border-gray-200 dark:border-gray-800">Posts</h2>
            {posts.map((post) => (
              <PostCard key={post.id} event={post} />
            ))}
          </div>
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
