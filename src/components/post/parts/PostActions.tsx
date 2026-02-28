"use client";

import React from "react";
import { MessageCircle, Repeat2, Heart, Zap } from "lucide-react";

interface PostActionsProps {
  likes: number;
  userReacted?: string | null;
  onReplyClick?: (e: React.MouseEvent) => void;
  onRepostClick?: (e: React.MouseEvent) => void;
  onLikeClick?: (e: React.MouseEvent) => void;
  onZapClick?: (e: React.MouseEvent) => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  likes,
  userReacted,
  onReplyClick,
  onRepostClick,
  onLikeClick,
  onZapClick
}) => {
  return (
    <div className="flex items-center justify-between max-w-md text-gray-500">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onReplyClick?.(e);
        }}
        aria-label="Reply"
        className="group flex items-center space-x-2 hover:text-blue-500 transition-colors"
      >
        <div className="p-2 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
          <MessageCircle size={18} />
        </div>
        <span className="text-xs">0</span>
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onRepostClick?.(e);
        }}
        aria-label="Repost"
        className="group flex items-center space-x-2 hover:text-green-500 transition-colors"
      >
        <div className="p-2 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
          <Repeat2 size={18} />
        </div>
        <span className="text-xs">0</span>
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onLikeClick?.(e);
        }}
        aria-label={userReacted === '+' ? "Unlike" : "Like"}
        className={`group flex items-center space-x-2 hover:text-pink-500 transition-colors ${userReacted === '+' ? 'text-pink-500' : ''}`}
      >
        <div className="p-2 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
          <Heart size={18} fill={userReacted === '+' ? 'currentColor' : 'none'} />
        </div>
        <span className="text-xs">{likes}</span>
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onZapClick?.(e);
        }}
        aria-label="Zap"
        className="group flex items-center space-x-2 hover:text-yellow-500 transition-colors"
      >
        <div className="p-2 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors">
          <Zap size={18} />
        </div>
        <span className="text-xs">0</span>
      </button>
    </div>
  );
};
