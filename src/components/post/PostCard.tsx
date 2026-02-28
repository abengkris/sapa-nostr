"use client";

import React, { useState, useEffect } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { useReactions } from "@/hooks/useReactions";
import { useNDK } from "@/lib/ndk";
import { useAuthStore } from "@/store/auth";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Repeat2, Heart, Zap, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ZapModal } from "@/components/common/ZapModal";
import { ContentRenderer } from "./ContentRenderer";

type ThreadLine = "none" | "top" | "bottom" | "both";

interface PostCardProps {
  event: NDKEvent;
  threadLine?: ThreadLine;
  isFocal?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  event, 
  threadLine = "none",
  isFocal = false 
}) => {
  const isRepost = event.kind === 6;
  const [repostedEvent, setRepostedEvent] = useState<NDKEvent | null>(null);
  const { user: currentUser } = useAuthStore();
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  
  const { profile } = useProfile(displayEvent.pubkey);
  const { likes, userReacted } = useReactions(displayEvent.id);
  const [showZapModal, setShowZapModal] = useState(false);
  const { ndk, isReady } = useNDK();
  const router = useRouter();

  useEffect(() => {
    if (isRepost && isReady && ndk) {
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

  const repostAuthorName = event.pubkey === currentUser?.pubkey 
    ? "You" 
    : (repostAuthorProfile?.name || `${event.pubkey.slice(0, 8)}...`);

  // Detect Replying To
  const replyPTag = displayEvent.tags.find(t => t[0] === 'p' && t[3] === 'reply') || 
                    [...displayEvent.tags].reverse().find(t => t[0] === 'p');
  const replyingToPubkey = replyPTag ? replyPTag[1] : null;

  return (
    <div 
      onClick={() => router.push(`/post/${displayEvent.id}`)}
      className={`flex flex-col p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer dark:border-gray-800 dark:hover:bg-gray-900/50 ${
        isFocal ? "bg-blue-50/5 dark:bg-blue-900/5 border-l-4 border-l-blue-500" : ""
      }`}
    >
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <Repeat2 size={14} />
          <span>{repostAuthorName} reposted</span>
        </div>
      )}

      <div className="flex relative">
        {/* Thread Lines */}
        {(threadLine === "top" || threadLine === "both") && (
          <div className="absolute top-[-1rem] left-6 w-0.5 h-4 bg-gray-200 dark:bg-gray-800" />
        )}
        {(threadLine === "bottom" || threadLine === "both") && (
          <div className="absolute top-12 bottom-[-1rem] left-6 w-0.5 bg-gray-200 dark:bg-gray-800" />
        )}

        {/* Avatar */}
        <div className="mr-3 shrink-0 z-10" onClick={(e) => e.stopPropagation()}>
          <Link href={`/${displayEvent.pubkey}`}>
            <Image
              src={avatar}
              alt={displayName}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full object-cover bg-gray-200 ring-4 ring-white dark:ring-black"
              unoptimized={true}
            />
          </Link>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center space-x-1 truncate" onClick={(e) => e.stopPropagation()}>
              <Link href={`/${displayEvent.pubkey}`} className="font-bold hover:underline truncate">
                {displayName}
              </Link>
              <span className="text-gray-400 text-xs">·</span>
              <span className="text-gray-500 text-xs whitespace-nowrap">
                {createdAt}
              </span>
            </div>
            <button className="text-gray-400 hover:text-blue-500 transition-colors" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal size={18} />
            </button>
          </div>

          {/* Replying to label */}
          {replyingToPubkey && !isRepost && (
            <div className="text-gray-500 text-xs mb-1" onClick={(e) => e.stopPropagation()}>
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
              <span className="text-xs">0</span>
            </button>

            <button className="group flex items-center space-x-2 hover:text-green-500 transition-colors">
              <div className="p-2 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
                <Repeat2 size={18} />
              </div>
              <span className="text-xs">0</span>
            </button>

            <button className={`group flex items-center space-x-2 hover:text-pink-500 transition-colors ${userReacted === '+' ? 'text-pink-500' : ''}`}>
              <div className="p-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
                <Heart size={18} fill={userReacted === '+' ? 'currentColor' : 'none'} />
              </div>
              <span className="text-xs">{likes}</span>
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
              <span className="text-xs">0</span>
            </button>
          </div>
        </div>
      </div>

      {showZapModal && (
        <ZapModal
          event={displayEvent}
          onClose={() => setShowZapModal(false)}
        />
      )}
    </div>
  );
};
