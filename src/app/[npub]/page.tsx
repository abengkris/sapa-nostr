"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, Calendar, MapPin, Link as LinkIcon, UserPlus, UserMinus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/lib/ndk";
import { follow, unfollow } from "@/lib/actions/follow";
import { useFollowing } from "@/hooks/useFollowing";

export default function ProfilePage({ params }: { params: Promise<{ npub: string }> }) {
  const { npub } = use(params);
  const { profile, loading: profileLoading } = useProfile(npub);
  const { posts, loading: feedLoading } = useFeed([npub]);
  const { following: userFollowing } = useFollowing(useAuthStore.getState().user?.pubkey);
  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();

  const isFollowing = userFollowing.includes(npub);
  const isOwnProfile = currentUser?.pubkey === npub;

  const handleFollowToggle = async () => {
    if (!ndk) return;
    try {
      if (isFollowing) {
        await unfollow(ndk, npub);
      } else {
        await follow(ndk, npub);
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

  return (
    <MainLayout>
      {/* Header */}
      <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
        {profile?.banner && (
          <img src={profile.banner} alt="Banner" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex justify-between items-end -mt-16 mb-4">
          <div className="p-1 bg-white dark:bg-black rounded-full">
            <img src={avatar} alt={displayName} className="w-32 h-32 rounded-full object-cover bg-gray-200" />
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
          {profile?.nip05 && <p className="text-blue-500 text-sm">{profile.nip05}</p>}
          <p className="text-gray-500 text-sm font-mono">{npub.slice(0, 16)}...</p>
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
        <button className="flex-1 py-4 text-sm font-bold border-b-4 border-blue-500">Posts</button>
        <button className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900">Replies</button>
        <button className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900">Media</button>
        <button className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900">Likes</button>
      </div>

      {/* Feed */}
      <div className="pb-20">
        {feedLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="animate-spin text-blue-500" size={24} />
          </div>
        ) : (
          posts.map(post => <PostCard key={post.id} event={post} />)
        )}
      </div>
    </MainLayout>
  );
}
