"use client";

import React from "react";
import { NDKUserProfile } from "@nostr-dev-kit/ndk";
import { formatDistanceToNow } from "date-fns";
import { Repeat2, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PostHeaderProps {
  displayName: string;
  avatar: string;
  userNpub: string;
  createdAt: number | undefined;
  isRepost?: boolean;
  repostAuthorName?: string;
  onMoreClick?: (e: React.MouseEvent) => void;
  pronouns?: string;
  bot?: boolean | string;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  displayName,
  avatar,
  userNpub,
  createdAt,
  isRepost,
  repostAuthorName,
  onMoreClick,
  pronouns,
  bot
}) => {
  const formattedTime = createdAt
    ? formatDistanceToNow(new Date(createdAt * 1000), { addSuffix: true })
    : "unknown";

  return (
    <>
      {/* Repost Header */}
      {isRepost && (
        <div className="flex items-center space-x-2 text-gray-500 text-xs font-bold mb-2 ml-10">
          <Repeat2 size={14} />
          <span>{repostAuthorName} reposted</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-0.5 min-w-0">
        <div className="flex items-center space-x-1 truncate min-w-0" onClick={(e) => e.stopPropagation()}>
          <div className="mr-3 shrink-0 z-10">
            <Link href={`/${userNpub}`}>
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
          <div className="flex items-center gap-1 truncate min-w-0">
            <Link href={`/${userNpub}`} className="font-bold hover:underline truncate min-w-0">
              {displayName}
            </Link>
            {pronouns && (
              <span className="text-[10px] text-gray-500 font-medium shrink-0 bg-gray-100 dark:bg-gray-800 px-1 rounded">
                {pronouns}
              </span>
            )}
            {bot && (
              <span className="text-[9px] bg-blue-500/10 text-blue-500 border border-blue-500/20 px-1 rounded font-bold uppercase tracking-tighter shrink-0">
                Bot
              </span>
            )}
          </div>
          <span className="text-gray-500 text-xs shrink-0">·</span>
          <span className="text-gray-500 text-xs whitespace-nowrap shrink-0">
            {formattedTime}
          </span>
        </div>
        <button 
          className="text-gray-400 hover:text-blue-500 transition-colors shrink-0" 
          onClick={(e) => {
            e.stopPropagation();
            onMoreClick?.(e);
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </>
  );
};
