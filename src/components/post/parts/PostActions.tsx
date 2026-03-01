import React, { useState } from "react";
import { MessageCircle, Repeat2, Heart, Zap } from "lucide-react";
import { useUIStore } from "@/store/ui";

interface PostActionsProps {
  likes: number;
  zaps?: number;
  userReacted?: string | null;
  onReplyClick?: (e: React.MouseEvent) => void;
  onRepostClick?: (e: React.MouseEvent) => void;
  onLikeClick?: (e: React.MouseEvent) => void;
  onZapClick?: (e: React.MouseEvent) => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  likes: initialLikes,
  zaps = 0,
  userReacted: initialUserReacted,
  onReplyClick,
  onRepostClick,
  onLikeClick,
  onZapClick
}) => {
  const [optimisticLikes, setOptimisticLikes] = useState(initialLikes);
  const [optimisticReacted, setOptimisticReacted] = useState(initialUserReacted);
  const [optimisticReposted, setOptimisticReposted] = useState(false);
  const { addToast } = useUIStore();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (optimisticReacted === '+') {
      setOptimisticLikes(prev => Math.max(0, prev - 1));
      setOptimisticReacted(null);
    } else {
      setOptimisticLikes(prev => prev + 1);
      setOptimisticReacted('+');
      addToast("Liked!", "success");
    }
    onLikeClick?.(e);
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOptimisticReposted(true);
    addToast("Reposted!", "success");
    onRepostClick?.(e);
  };

  const formatSats = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="flex items-center justify-between max-w-md text-gray-500 -ml-2">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onReplyClick?.(e);
        }}
        aria-label="Reply"
        className="group flex items-center space-x-1 hover:text-blue-500 transition-colors"
      >
        <div className="p-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full transition-colors">
          <MessageCircle size={20} />
        </div>
        <span className="text-xs">0</span>
      </button>

      <button 
        onClick={handleRepost}
        aria-label="Repost"
        className={`group flex items-center space-x-1 hover:text-green-500 transition-colors ${optimisticReposted ? 'text-green-500' : ''}`}
      >
        <div className="p-3 group-hover:bg-green-50 dark:group-hover:bg-green-900/20 rounded-full transition-colors">
          <Repeat2 size={20} className={optimisticReposted ? "animate-in spin-in-180 duration-500" : ""} />
        </div>
        <span className="text-xs">0</span>
      </button>

      <button 
        onClick={handleLike}
        aria-label={optimisticReacted === '+' ? "Unlike" : "Like"}
        className={`group flex items-center space-x-1 hover:text-pink-500 transition-colors ${optimisticReacted === '+' ? 'text-pink-500' : ''}`}
      >
        <div className="p-3 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/20 rounded-full transition-colors">
          <Heart size={20} fill={optimisticReacted === '+' ? 'currentColor' : 'none'} className={optimisticReacted === '+' ? "animate-in zoom-in-125 duration-300" : ""} />
        </div>
        <span className="text-xs">{optimisticLikes}</span>
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          onZapClick?.(e);
        }}
        aria-label="Zap"
        className="group flex items-center space-x-1 hover:text-yellow-500 transition-colors"
      >
        <div className="p-3 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/20 rounded-full transition-colors">
          <Zap size={20} className={zaps > 0 ? "text-yellow-500 fill-yellow-500" : ""} />
        </div>
        <span className={`text-xs ${zaps > 0 ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""}`}>
          {zaps > 0 ? formatSats(zaps) : "0"}
        </span>
      </button>
    </div>
  );
};
