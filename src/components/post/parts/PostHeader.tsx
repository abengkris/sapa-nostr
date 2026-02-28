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
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  displayName,
  avatar,
  userNpub,
  createdAt,
  isRepost,
  repostAuthorName,
  onMoreClick
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

      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center space-x-1 truncate" onClick={(e) => e.stopPropagation()}>
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
          <Link href={`/${userNpub}`} className="font-bold hover:underline truncate">
            {displayName}
          </Link>
          <span className="text-gray-400 text-xs">·</span>
          <span className="text-gray-500 text-xs whitespace-nowrap">
            {formattedTime}
          </span>
        </div>
        <button 
          className="text-gray-400 hover:text-blue-500 transition-colors" 
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
