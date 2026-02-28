"use client";

import React, { useState, useEffect } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { useReactions } from "@/hooks/useReactions";
import { useNDK } from "@/lib/ndk";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Repeat2, Heart, Zap, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ZapModal } from "@/components/common/ZapModal";
import { ContentRenderer } from "./ContentRenderer";

interface PostCardProps {
  event: NDKEvent;
}

export const PostCard: React.FC<PostCardProps> = ({ event }) => {
  const isRepost = event.kind === 6;
  const [repostedEvent, setRepostedEvent] = useState<NDKEvent | null>(null);
  
  // Use the original event if it's a repost
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  
  const { profile, loading: profileLoading } = useProfile(displayEvent.pubkey);
  const { likes, userReacted } = useReactions(displayEvent.id);
  const [showZapModal, setShowZapModal] = useState(false);
  const { ndk, isReady } = useNDK();
  const router = useRouter();

  useEffect(() => {
    if (isRepost && isReady && ndk) {
      // Extract original event ID from tags
      const eTag = event.tags.find(t => t[0] === 'e');
      if (eTag) {
        ndk.fetchEvent(eTag[1]).then(setRepostedEvent);
      }
    }
  }, [isRepost, event, isReady, ndk]);

  const createdAt = displayEvent.created_at 
    ? formatDistanceToNow(new Date(displayEvent.created_at * 1000), { addSuffix: true })
    : "unknown";

  const displayName = profile?.name || profile?.displayName || `${displayEvent.pubkey.slice(0, 8)}...`;
  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEvent.pubkey}`;

  // Get the pubkey we are replying to
  const replyTag = displayEvent.tags.find(t => t[0] === 'p');
  const replyingToPubkey = replyTag ? replyTag[1] : null;

  return (
    <div 
      onClick={() => router.push(`/post/${displayEvent.id}`)}
      className="flex flex-col p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer dark:border-gray-800 dark:hover:bg-gray-900/50"
    >
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <Repeat2 size={14} />
          <span>You reposted</span>
        </div>
      )}

      <div className="flex">
        {/* Avatar */}
        <div className="mr-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Link href={`/${displayEvent.pubkey}`}>
            <Image
              src={avatar}
              alt={displayName}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover bg-gray-200"
              unoptimized={true}
            />
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center space-x-1 truncate" onClick={(e) => e.stopPropagation()}>
              <Link href={`/${displayEvent.pubkey}`} className="font-bold hover:underline truncate">
                {displayName}
              </Link>
              {profile?.nip05 && (
                <span className="text-gray-500 text-sm truncate">
                  {profile.nip05}
                </span>
              )}
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 text-sm whitespace-nowrap">
                {createdAt}
              </span>
            </div>
            <button className="text-gray-400 hover:text-blue-500 transition-colors" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Replying to label */}
          {replyingToPubkey && !isRepost && (
            <div className="text-gray-500 text-sm mb-1" onClick={(e) => e.stopPropagation()}>
              Replying to <Link href={`/${replyingToPubkey}`} className="text-blue-500 hover:underline">@{replyingToPubkey.slice(0, 8)}...</Link>
            </div>
          )}

          <div className="mb-3">
            <ContentRenderer content={displayEvent.content} />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between max-w-md text-gray-500">
            <button className="group flex items-center space-x-2 hover:text-blue-500 transition-colors">
              <div className="p-2 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">0</span>
            </button>

            <button className="group flex items-center space-x-2 hover:text-green-500 transition-colors">
              <div className="p-2 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
                <Repeat2 size={18} />
              </div>
              <span className="text-sm">0</span>
            </button>

            <button className={`group flex items-center space-x-2 hover:text-pink-500 transition-colors ${userReacted === '+' ? 'text-pink-500' : ''}`}>
              <div className="p-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
                <Heart size={18} fill={userReacted === '+' ? 'currentColor' : 'none'} />
              </div>
              <span className="text-sm">{likes}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowZapModal(true);
              }}
              className="group flex items-center space-x-2 hover:text-yellow-500 transition-colors"
            >
              <div className="p-2 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors">
                <Zap size={18} />
              </div>
              <span className="text-sm">0</span>
            </button>
          </div>
        </div>
      </div>

      {showZapModal && (
        <ZapModal
          event={event}
          onClose={() => setShowZapModal(false)}
          onSuccess={() => {
            // Optional: update local zap count
          }}
        />
      )}
    </div>
  );
};
