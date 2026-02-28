"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, Calendar, MapPin, Link as LinkIcon, UserPlus, UserMinus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { follow, unfollow } from "@/lib/actions/follow";
import { useFollowing } from "@/hooks/useFollowing";

import Image from "next/image";

import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { decodeToHex } from "@/lib/utils/nip19";

type ProfileTab = "posts" | "replies" | "media" | "likes";

export default function ProfilePage({ params }: { params: Promise<{ npub: string }> }) {
  const { npub } = use(params);
  const hexPubkey = decodeToHex(npub);
  
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("posts");
  const { profile, loading: profileLoading } = useProfile(hexPubkey);
  
  const { following: userFollowing } = useFollowing(useAuthStore.getState().user?.pubkey);
  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();

  // Determine feed parameters based on tab
  const feedKinds = activeTab === "likes" ? [7] : [1];
  const disableFiltering = activeTab === "replies" || activeTab === "likes";
  
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed([hexPubkey], feedKinds, disableFiltering);

  const isFollowing = userFollowing.includes(hexPubkey);
  const isOwnProfile = currentUser?.pubkey === hexPubkey;

  const handleFollowToggle = async () => {
    if (!ndk) return;
    try {
      if (isFollowing) {
        await unfollow(ndk, hexPubkey);
      } else {
        await follow(ndk, hexPubkey);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </MainLayout>
    );
  }

  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${npub}`;
  const displayName = profile?.name || profile?.displayName || `${npub.slice(0, 8)}...`;

  // Custom filter for "Replies" tab since NDK might return both root and replies
  const filteredPosts = activeTab === "replies" 
    ? posts.filter(p => p.tags.some(t => t[0] === 'e'))
    : activeTab === "posts"
    ? posts.filter(p => !p.tags.some(t => t[0] === 'e'))
    : posts;

  return (
    <MainLayout>
      {/* Header */}
      <div className="h-48 bg-gray-200 dark:bg-gray-800 relative overflow-hidden">
        {profile?.banner ? (
          <Image src={profile.banner} alt="Banner" fill className="object-cover" unoptimized />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20" />
        )}
      </div>

      <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex justify-between items-end -mt-16 mb-4">
          <div className="p-1 bg-white dark:bg-black rounded-full ring-4 ring-white dark:ring-black">
            <Image 
              src={avatar} 
              alt={displayName} 
              width={128} 
              height={128} 
              className="w-32 h-32 rounded-full object-cover bg-gray-200" 
              unoptimized
            />
          </div>
          
          {!isOwnProfile && currentUser && (
            <button
              onClick={handleFollowToggle}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                isFollowing 
                  ? "border border-gray-300 hover:border-red-500 hover:text-red-500 hover:bg-red-50 dark:border-gray-700" 
                  : "bg-black dark:bg-white text-white dark:text-black hover:opacity-90"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          {profile?.nip05 && <p className="text-blue-500 text-sm font-medium">{profile.nip05}</p>}
          <p className="text-gray-500 text-xs font-mono break-all bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
            {npub}
          </p>
        </div>

        {profile?.about && (
          <div className="mt-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {profile.about}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-gray-500 text-sm">
          {profile?.website && (
            <a href={profile.website} target="_blank" className="flex items-center space-x-1 hover:underline text-blue-500">
              <LinkIcon size={16} />
              <span>{new URL(profile.website).hostname}</span>
            </a>
          )}
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>Joined Nostr</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        {(["posts", "replies", "media", "likes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-bold capitalize transition-colors relative ${
              activeTab === tab ? "text-blue-500" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="pb-20">
        {feedLoading && filteredPosts.length === 0 ? (
          <FeedSkeleton />
        ) : filteredPosts.length > 0 ? (
          <>
            {filteredPosts.map(post => <PostCard key={post.id} event={post} />)}
            {hasMore && (
              <div className="p-8 text-center border-t border-gray-100 dark:border-gray-900">
                <button 
                  onClick={() => loadMore()}
                  disabled={feedLoading}
                  className="text-blue-500 text-sm font-bold hover:underline disabled:opacity-50"
                >
                  {feedLoading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        ) : !feedLoading && (
          <div className="p-12 text-center text-gray-500">
            No {activeTab} to show.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
