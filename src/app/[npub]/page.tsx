"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProfile } from "@/hooks/useProfile";
import { useFeed } from "@/hooks/useFeed";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, Calendar, MapPin, Link as LinkIcon, Zap, Activity } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useFollowingList } from "@/hooks/useFollowingList";
import { useFollowerCount } from "@/hooks/useFollowers";
import { FollowButton } from "@/components/profile/FollowButton";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { UserIdentity } from "@/components/common/UserIdentity";
import { ZapModal } from "@/components/common/ZapModal";
import { useZaps } from "@/hooks/useZaps";
import { useRelayList } from "@/hooks/useRelayList";
import { useUserStatus } from "@/hooks/useUserStatus";
import { Music, Activity as StatusIcon } from "lucide-react";
import { FollowedBy } from "@/components/profile/FollowedBy";

import Image from "next/image";
import Link from "next/link";

import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { format } from "date-fns";
import { decodeNip19, shortenPubkey } from "@/lib/utils/nip19";

type ProfileTab = "posts" | "replies" | "media" | "likes";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function ProfilePage({ params }: { params: Promise<{ npub: string }> }) {
  const { npub: npubParam } = use(params);
  const { id: hexPubkey } = decodeNip19(npubParam);
  
  const [activeTab, setActiveTab] = React.useState<ProfileTab>("posts");
  const { profile, loading: profileLoading } = useProfile(hexPubkey);
  const { relays: userRelays, loading: relaysLoading } = useRelayList(hexPubkey);
  const { generalStatus, musicStatus } = useUserStatus(hexPubkey);
  
  const { count: followingCount, loading: fwLoading } = useFollowingList(hexPubkey);
  const { count: followerCount, loading: fLoading } = useFollowerCount(hexPubkey);
  const { totalSats } = useZaps(hexPubkey, true);

  const { ndk } = useNDK();
  const { user: currentUser } = useAuthStore();

  // Determine feed parameters based on tab
  const feedKinds = activeTab === "likes" ? [7] : [1];
  const disableFiltering = activeTab === "replies" || activeTab === "likes";
  
  const { posts, loading: feedLoading, loadMore, hasMore } = useFeed([hexPubkey], feedKinds, disableFiltering);

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [showZapModal, setShowZapModal] = React.useState(false);
  const isOwnProfile = currentUser?.pubkey === hexPubkey;

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="px-4 pb-4 animate-pulse">
          <div className="relative flex justify-between items-end -mt-16 mb-4">
            <div className="w-32 h-32 rounded-full bg-gray-300 dark:bg-gray-700 ring-4 ring-white dark:ring-black" />
            <div className="w-32 h-10 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-full" />
            <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded w-2/3" />
          </div>
        </div>
        <FeedSkeleton />
      </MainLayout>
    );
  }

  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${hexPubkey}`;
  const displayName = profile?.name || profile?.displayName || shortenPubkey(npubParam);

  const safeHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Custom filter for "Replies" tab
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
          
          <div className="flex gap-2 items-center">
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-full font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
              >
                Edit Profile
              </button>
            ) : currentUser && (
              <>
                <button
                  onClick={() => setShowZapModal(true)}
                  className="p-2 border border-gray-300 dark:border-gray-700 rounded-full hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-500 transition-all"
                  aria-label="Zap User"
                >
                  <Zap size={20} fill="currentColor" />
                </button>
                <FollowButton targetPubkey={hexPubkey} size="lg" />
              </>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserIdentity 
              pubkey={hexPubkey}
              displayName={profile?.name || profile?.displayName}
              nip05={profile?.nip05}
              variant="profile"
            />
            {profile?.pronouns && (
              <span className="text-xs text-gray-500 font-medium bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded mt-1">
                {profile.pronouns}
              </span>
            )}
            {profile?.bot && (
              <span className="text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest mt-1">
                Bot
              </span>
            )}
          </div>
          
          {/* User Status Badges */}
          <div className="flex flex-wrap gap-2 py-1">
            {generalStatus?.content && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold animate-in fade-in zoom-in-95 duration-500">
                <StatusIcon size={12} />
                <span>{generalStatus.content}</span>
                {generalStatus.link && (
                  <a href={generalStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500">
                    <LinkIcon size={10} />
                  </a>
                )}
              </div>
            )}
            {musicStatus?.content && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 dark:bg-pink-900/20 border border-pink-100 dark:border-pink-800 text-pink-600 dark:text-pink-400 rounded-full text-xs font-bold animate-in fade-in zoom-in-95 duration-500">
                <Music size={12} />
                <span>{musicStatus.content}</span>
                {musicStatus.link && (
                  <a href={musicStatus.link} target="_blank" rel="noopener noreferrer" className="hover:text-pink-500">
                    <LinkIcon size={10} />
                  </a>
                )}
              </div>
            )}
          </div>

          <p className="text-gray-500 text-xs font-mono break-all bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
            {npubParam}
          </p>
        </div>

        {profile?.about && (
          <div className="mt-4 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
            {profile.about}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-gray-500 text-sm">
          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1 hover:underline text-blue-500">
              <LinkIcon size={16} />
              <span>{safeHostname(profile.website)}</span>
            </a>
          )}
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>
              {profile?.published_at 
                ? `${format(new Date(profile.published_at * 1000), "MMMM yyyy")}` 
                : "-"
              }
            </span>
          </div>
        </div>

        {!isOwnProfile && <FollowedBy pubkey={hexPubkey} />}

        {/* Stats */}
        <div className="flex gap-5 mt-4">
          <Link
            href={`/${npubParam}/followers?tab=following`}
            className="hover:underline flex items-center gap-1"
          >
            <span className="font-bold text-gray-900 dark:text-white">
              {fwLoading ? "–" : followingCount.toLocaleString()}
            </span>
            <span className="text-gray-500">Following</span>
          </Link>

          <Link href={`/${npubParam}/followers?tab=followers`} className="hover:underline flex items-center gap-1">
            <span className="font-bold text-gray-900 dark:text-white">
              {fLoading ? "–" : formatCount(followerCount)}
            </span>
            <span className="text-gray-500">Followers</span>
          </Link>

          <div className="flex items-center gap-1 cursor-default">
            <Zap size={14} className="text-yellow-500" fill="currentColor" />
            <span className="font-bold text-gray-900 dark:text-white">
              {formatCount(totalSats)}
            </span>
            <span className="text-gray-500">Sats</span>
          </div>

          {!relaysLoading && userRelays.length > 0 && (
            <div className="flex items-center gap-1 cursor-default" title={userRelays.map(r => r.url).join("\n")}>
              <Activity size={14} className="text-green-500" />
              <span className="font-bold text-gray-900 dark:text-white">
                {userRelays.length}
              </span>
              <span className="text-gray-500">Relays</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800" role="tablist">
        {(["posts", "replies", "media", "likes"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
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
            <div className="divide-y divide-gray-100 dark:divide-gray-900">
              {filteredPosts.map(post => <PostCard key={post.id} event={post} />)}
            </div>
            {hasMore && (
              <div className="p-8 text-center border-t border-gray-100 dark:border-gray-900">
                <button 
                  onClick={() => loadMore()}
                  disabled={feedLoading}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-900 rounded-full text-blue-500 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {feedLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Loading...
                    </span>
                  ) : "Show more results"}
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

      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={profile}
        onSuccess={() => {
          // Force reload to see changes
          window.location.reload();
        }}
      />

      {showZapModal && ndk && (
        <ZapModal
          user={ndk.getUser({ pubkey: hexPubkey })}
          onClose={() => setShowZapModal(false)}
        />
      )}
    </MainLayout>
  );
}
