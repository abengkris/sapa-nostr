"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface ContentRendererProps {
  content: string;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ content }) => {
  // Regex patterns
  const URL_REGEX = /(https?:\/\/[^\s]+)/g;
  const HASHTAG_REGEX = /#(\w+)/g;
  const NOSTR_URI_REGEX = /(nostr:)?(npub1|note1|nevent1|naddr1|nprofile1)[0-9a-z]+/gi;
  const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const VIDEO_REGEX = /\.(mp4|webm|ogg)(\?.*)?$/i;

  const parts = content.split(/(\s+)/);

  return (
    <div className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap leading-normal space-y-3">
      <div>
        {parts.map((part, i) => {
          // 1. Handle URLs
          if (part.match(URL_REGEX)) {
            const cleanUrl = part.replace(/[.,;]$/, ""); // Remove trailing punctuation
            
            // Skip rendering if it's an image/video (handled below in media section)
            if (cleanUrl.match(IMAGE_REGEX) || cleanUrl.match(VIDEO_REGEX)) {
              return (
                <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                  {cleanUrl}
                </a>
              );
            }

            return (
              <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                {cleanUrl}
              </a>
            );
          }

          // 2. Handle Hashtags
          if (part.match(HASHTAG_REGEX)) {
            const tag = part.slice(1).replace(/[^\w]/g, "");
            return (
              <Link key={i} href={`/search?q=${tag}`} className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                #{tag}
              </Link>
            );
          }

          // 3. Handle Nostr URIs (@npub...)
          if (part.match(NOSTR_URI_REGEX)) {
            const uri = part.startsWith("nostr:") ? part.slice(6) : part;
            const prefix = uri.slice(0, 4);
            
            let href = `/${uri}`;
            if (prefix === "note" || prefix === "neve") href = `/post/${uri}`;

            return (
              <Link key={i} href={href} className="text-blue-500 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                {part}
              </Link>
            );
          }

          return part;
        })}
      </div>

      {/* Media Section (Images/Videos found in content) */}
      <div className="flex flex-col gap-2 mt-2">
        {parts.filter(p => p.match(URL_REGEX)).map((url, i) => {
          const cleanUrl = url.replace(/[.,;]$/, "");
          
          if (cleanUrl.match(IMAGE_REGEX)) {
            return (
              <div key={i} className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[500px]" onClick={(e) => e.stopPropagation()}>
                <img
                  src={cleanUrl}
                  alt="Post content"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            );
          }

          if (cleanUrl.match(VIDEO_REGEX)) {
            return (
              <div key={i} className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black" onClick={(e) => e.stopPropagation()}>
                <video
                  src={cleanUrl}
                  controls
                  className="w-full max-h-[500px]"
                  preload="metadata"
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
