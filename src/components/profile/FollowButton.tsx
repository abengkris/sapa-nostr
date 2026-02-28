// src/components/profile/FollowButton.tsx
"use client";

import { useFollowState } from "@/hooks/useFollowState";
import { useAuthStore } from "@/store/auth";

interface FollowButtonProps {
  targetPubkey: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function FollowButton({
  targetPubkey,
  className = "",
  size = "md",
}: FollowButtonProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { isFollowing, isLoading, isPending, toggle } =
    useFollowState(targetPubkey);

  // Jangan tampilkan tombol untuk diri sendiri
  if (currentUser?.pubkey === targetPubkey) return null;

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-1.5 text-sm",
    lg: "px-6 py-2 text-base",
  };

  if (isLoading) {
    return (
      <div
        className={`
          ${sizeClasses[size]} rounded-full bg-zinc-800 animate-pulse w-20 h-8
          ${className}
        `}
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // jangan trigger PostCard click
        toggle();
      }}
      disabled={isPending}
      className={`
        ${sizeClasses[size]}
        font-semibold rounded-full border transition-all duration-150
        ${isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        ${
          isFollowing
            ? // State: following → hover shows "Unfollow"
              "bg-transparent border-zinc-600 text-white hover:border-red-500 hover:text-red-400 hover:bg-red-950/30 group"
            : // State: not following
              "bg-white text-black border-white hover:bg-zinc-200"
        }
        ${className}
      `}
    >
      {isPending ? (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          {isFollowing ? "Unfollow..." : "Follow..."}
        </span>
      ) : isFollowing ? (
        <>
          <span className="group-hover:hidden">Mengikuti</span>
          <span className="hidden group-hover:inline text-red-400">Berhenti Ikuti</span>
        </>
      ) : (
        "Ikuti"
      )}
    </button>
  );
}
