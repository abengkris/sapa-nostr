"use client";

import React from "react";
import Link from "next/link";
import { QuoteRenderer } from "./QuoteRenderer";
import { Mention } from "./Mention";

interface ContentRendererProps {
  content: string;
}

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
const VIDEO_REGEX = /\.(mp4|webm|ogg)(\?.*)?$/i;

const MediaItem = ({ url, isVideo }: { url: string; isVideo?: boolean }) => {
  if (isVideo) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <video
          src={url}
          controls
          className="max-w-full max-h-full"
          preload="metadata"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900 overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <img
        src={url}
        alt="Post content"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
  );
};

const MediaGrid = ({ items }: { items: { url: string; type: 'image' | 'video' }[] }) => {
  const count = items.length;
  
  if (count === 0) return null;

  // Single item layout
  if (count === 1) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 mt-3 max-h-[400px] sm:max-h-[500px]">
        <MediaItem url={items[0].url} isVideo={items[0].type === 'video'} />
      </div>
    );
  }

  // Multi-item layouts (Grid)
  return (
    <div className={`grid gap-1 mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 h-[250px] sm:h-[350px] ${
      count === 2 ? "grid-cols-2" : 
      count === 3 ? "grid-cols-2 grid-rows-2" : 
      "grid-cols-2 grid-rows-2"
    }`}>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} className={`${
          count === 3 && i === 0 ? "row-span-2" : ""
        }`}>
          <MediaItem url={item.url} isVideo={item.type === 'video'} />
        </div>
      ))}
    </div>
  );
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({ content }) => {
  // Regex patterns
  const URL_REGEX = /https?:\/\/[^\s]+/gi;
  const HASHTAG_REGEX = /#\w+/g;
  const NOSTR_URI_REGEX = /(nostr:)?(npub1|note1|nevent1|naddr1|nprofile1)[0-9a-z]+/gi;

  // Track quoted notes to avoid double rendering
  const quotedIds = new Set<string>();

  // Tokenize the content
  const tokenize = (text: string) => {
    const combinedRegex = new RegExp(
      `(${URL_REGEX.source})|(${HASHTAG_REGEX.source})|(${NOSTR_URI_REGEX.source})`,
      "gi"
    );

    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }

      const value = match[0];
      if (value.match(URL_REGEX)) {
        tokens.push({ type: "url", value });
      } else if (value.match(HASHTAG_REGEX)) {
        tokens.push({ type: "hashtag", value });
      } else if (value.match(NOSTR_URI_REGEX)) {
        tokens.push({ type: "nostr", value });
      }

      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push({ type: "text", value: text.slice(lastIndex) });
    }

    return tokens;
  };

  const tokens = tokenize(content);
  
  // Extract media items
  const mediaItems = tokens
    .filter(t => t.type === "url")
    .map(t => {
      const url = t.value.replace(/[.,;]$/, "");
      if (url.match(IMAGE_REGEX)) return { url, type: 'image' as const };
      if (url.match(VIDEO_REGEX)) return { url, type: 'video' as const };
      return null;
    })
    .filter((item): item is { url: string; type: 'image' | 'video' } => item !== null);

  return (
    <div className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap leading-normal max-w-full overflow-hidden">
      <div className="max-w-full">
        {tokens.map((token, i) => {
          if (token.type === "url") {
            const cleanUrl = token.value.replace(/[.,;]$/, "");
            if (cleanUrl.match(IMAGE_REGEX) || cleanUrl.match(VIDEO_REGEX)) {
              return null; // Don't render link text for media
            }
            return (
              <a key={i} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all" onClick={(e) => e.stopPropagation()}>
                {token.value}
              </a>
            );
          }

          if (token.type === "hashtag") {
            const tag = token.value.slice(1);
            return (
              <Link key={i} href={`/search?q=${tag}`} className="text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                {token.value}
              </Link>
            );
          }

          if (token.type === "nostr") {
            const cleanUri = token.value.replace(/[.,;]$/, "");
            const uriWithoutScheme = cleanUri.startsWith("nostr:") ? cleanUri.slice(6) : cleanUri;
            const prefix = uriWithoutScheme.slice(0, 4);
            
            if (prefix === "npub" || prefix === "npro") {
              return <Mention key={i} uri={cleanUri} />;
            }

            if (prefix === "note" || prefix === "neve" || prefix === "nadd") {
              quotedIds.add(uriWithoutScheme);
              return (
                <Link key={i} href={`/post/${uriWithoutScheme}`} className="text-blue-500 hover:underline break-all font-mono text-[10px] bg-gray-100 dark:bg-gray-900 px-1 rounded inline-block translate-y-[-1px]" onClick={(e) => e.stopPropagation()}>
                  {uriWithoutScheme.slice(0, 12)}…{uriWithoutScheme.slice(-4)}
                </Link>
              );
            }
          }

          return <span key={i}>{token.value}</span>;
        })}
      </div>

      {/* Quoted Posts Section */}
      {Array.from(quotedIds).map((id) => (
        <div key={id} className="mt-3" onClick={(e) => e.stopPropagation()}>
          <QuoteRenderer id={id} />
        </div>
      ))}

      {/* Optimized Media Section */}
      <MediaGrid items={mediaItems} />
    </div>
  );
};
