"use client";

import React, { useState, useEffect, useMemo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useProfile } from "@/hooks/useProfile";
import { useReactions } from "@/hooks/useReactions";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZapModal } from "@/components/common/ZapModal";
import { PostHeader } from "./parts/PostHeader";
import { PostContentRenderer } from "./parts/PostContent";
import { PostActions } from "./parts/PostActions";
import { deletePost } from "@/lib/actions/post";
import { useUIStore } from "@/store/ui";
import { useZaps } from "@/hooks/useZaps";
import { RawEventModal } from "./parts/RawEventModal";
import { ReportModal } from "./parts/ReportModal";

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
  const [repostedEvent, setRepostedEvent] = useState<NDKEvent | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const { user: currentUser } = useAuthStore();
  const { ndk, isReady } = useNDK();
  const router = useRouter();
  const [showZapModal, setShowZapModal] = useState(false);
  const [showRawModal, setShowRawModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { addToast } = useUIStore();

  const isRepost = event.kind === 6;
  const { profile: repostAuthorProfile } = useProfile(isRepost ? event.pubkey : undefined);
  
  const displayEvent = isRepost && repostedEvent ? repostedEvent : event;
  const { profile } = useProfile(displayEvent.pubkey);
  const { likes, userReacted } = useReactions(displayEvent.id);
  const { totalSats } = useZaps(displayEvent.id);

  useEffect(() => {
    if (isRepost && isReady && ndk) {
      const eTag = event.tags.find(t => t[0] === 'e');
      if (eTag) {
        ndk.fetchEvent(eTag[1]).then(setRepostedEvent);
      }
    }
  }, [isRepost, event, isReady, ndk]);

  const displayName = useMemo(() => 
    profile?.name || profile?.displayName || displayEvent.pubkey,
  [profile, displayEvent.pubkey]);

  const avatar = useMemo(() => 
    profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayEvent.pubkey}`,
  [profile, displayEvent.pubkey]);

  const repostAuthorName = useMemo(() => {
    return event.pubkey === currentUser?.pubkey 
      ? "You" 
      : (repostAuthorProfile?.name || repostAuthorProfile?.displayName || event.pubkey);
  }, [event.pubkey, currentUser?.pubkey, repostAuthorProfile]);

  const userNpub = displayEvent.author.npub;
  const eventNoteId = displayEvent.encode();

  const replyingToNpub = useMemo(() => {
    const replyPTag = displayEvent.tags.find(t => t[0] === 'p' && t[3] === 'reply') || 
                      [...displayEvent.tags].reverse().find(t => t[0] === 'p');
    const pubkey = replyPTag ? replyPTag[1] : null;
    return pubkey ? ndk?.getUser({ pubkey }).npub : null;
  }, [displayEvent.tags, ndk]);

  const handleDelete = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!ndk || !displayEvent.id) return;
    
    try {
      const success = await deletePost(ndk, displayEvent.id);
      if (success) {
        setIsDeleted(true);
        addToast("Post deletion request sent", "success");
      } else {
        addToast("Failed to delete post", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error deleting post", "error");
    }
  };

  if (isDeleted) return null;

  return (
    <article 
      className={`group relative flex flex-col p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-900/50 ${
        isFocal ? "bg-blue-50/5 dark:bg-blue-900/5 border-l-4 border-l-blue-500" : ""
      }`}
    >
      {/* Stretched Link for Accessibility */}
      <Link 
        href={`/post/${eventNoteId}`}
        className="absolute inset-0 z-0"
        aria-label={`View post by ${displayName}`}
      />

      <div className="flex relative min-w-0 z-10 pointer-events-none">
        {/* Thread Lines */}
        {(threadLine === "top" || threadLine === "both") && (
          <div className="absolute top-[-1rem] left-6 w-0.5 h-4 bg-gray-200 dark:bg-gray-800" />
        )}
        {(threadLine === "bottom" || threadLine === "both") && (
          <div className="absolute top-12 bottom-[-1rem] left-6 w-0.5 bg-gray-200 dark:bg-gray-800" />
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 overflow-hidden pointer-events-auto">
          <PostHeader
            displayName={displayName}
            avatar={avatar}
            userNpub={userNpub}
            pubkey={displayEvent.pubkey}
            nip05={profile?.nip05}
            createdAt={displayEvent.created_at}
            isRepost={isRepost}
            repostAuthorName={repostAuthorName}
            bot={profile?.bot}
            onDeleteClick={currentUser?.pubkey === displayEvent.pubkey ? handleDelete : undefined}
            onReportClick={currentUser?.pubkey !== displayEvent.pubkey ? () => setShowReportModal(true) : undefined}
            onMoreClick={() => setShowRawModal(true)}
          />

          <PostContentRenderer
            content={displayEvent.content}
            replyingToNpub={replyingToNpub}
            isRepost={isRepost}
            event={displayEvent}
          />

          <PostActions
            eventId={displayEvent.id}
            likes={likes}
            zaps={totalSats}
            userReacted={userReacted}
            onZapClick={() => setShowZapModal(true)}
          />
        </div>
      </div>

      {showZapModal && (
        <div className="relative z-20">
          <ZapModal
            event={displayEvent}
            onClose={() => setShowZapModal(false)}
          />
        </div>
      )}

      {showRawModal && (
        <div className="relative z-20">
          <RawEventModal
            event={displayEvent}
            isOpen={showRawModal}
            onClose={() => setShowRawModal(false)}
          />
        </div>
      )}

      {showReportModal && (
        <div className="relative z-20">
          <ReportModal
            targetPubkey={displayEvent.pubkey}
            targetEventId={displayEvent.id}
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
          />
        </div>
      )}
    </article>
  );
};
