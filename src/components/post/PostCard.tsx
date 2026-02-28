"use client";

import React, { useState } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { useReactions } from "@/hooks/useReactions";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Repeat2, Heart, Zap, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { ZapModal } from "@/components/common/ZapModal";

interface PostCardProps {
  event: NDKEvent;
}

export const PostCard: React.FC<PostCardProps> = ({ event }) => {
  const { profile, loading: profileLoading } = useProfile(event.pubkey);
  const { likes, userReacted } = useReactions(event.id);
  const [showZapModal, setShowZapModal] = useState(false);

  const createdAt = event.created_at 
    ? formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true })
    : "unknown";

  // Basic content parsing for mentions and hashtags
  const renderContent = () => {
    const parts = event.content.split(/(\s+)/);
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        const tag = part.slice(1).replace(/[^\w]/g, "");
        return (
          <Link key={i} href={`/search?q=${tag}`} className="text-blue-500 hover:underline">
            #{tag}
          </Link>
        );
      }
      if (part.startsWith("@npub1")) {
        return (
          <Link key={i} href={`/p/${part.slice(1)}`} className="text-blue-500 hover:underline">
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  const displayName = profile?.name || profile?.displayName || `${event.pubkey.slice(0, 8)}...`;
  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.pubkey}`;

  return (
    <div className="flex p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer dark:border-gray-800 dark:hover:bg-gray-900/50">
      {/* Avatar */}
      <div className="mr-3 shrink-0">
        <Link href={`/p/${event.pubkey}`}>
          <img
            src={avatar}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover bg-gray-200"
          />
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1 truncate">
            <Link href={`/p/${event.pubkey}`} className="font-bold hover:underline truncate">
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
          <button className="text-gray-400 hover:text-blue-500 transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap mb-3 leading-normal">
          {renderContent()}
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
