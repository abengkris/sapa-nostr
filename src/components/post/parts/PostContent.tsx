"use client";

import React from "react";
import Link from "next/link";
import { ContentRenderer } from "../ContentRenderer";

interface PostContentProps {
  content: string;
  replyingToNpub?: string | null;
  isRepost?: boolean;
}

export const PostContent: React.FC<PostContentProps> = ({
  content,
  replyingToNpub,
  isRepost
}) => {
  return (
    <>
      {/* Replying to label */}
      {replyingToNpub && !isRepost && (
        <div className="text-gray-500 text-xs mb-1" onClick={(e) => e.stopPropagation()}>
          Replying to <Link href={`/${replyingToNpub}`} className="text-blue-500 hover:underline">@{replyingToNpub.slice(0, 12)}...</Link>
        </div>
      )}

      <div className="mb-3">
        <ContentRenderer content={content} />
      </div>
    </>
  );
};
