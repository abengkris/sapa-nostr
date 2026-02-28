"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { QuoteRenderer } from "./QuoteRenderer";
import { Mention } from "./Mention";
import { NDKTag } from "@nostr-dev-kit/ndk";

interface ContentRendererProps {
  content: string;
  tags?: NDKTag[];
}

const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
const VIDEO_REGEX = /\.(mp4|webm|ogg)(\?.*)?$/i;

const MediaItem = ({ url, isVideo }: { url: string; isVideo?: boolean }) => {
  if (isVideo) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <video
          src={url}
          controls
          className="max-w-full max-h-full block"
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
        className="w-full h-full object-cover block"
        loading="lazy"
      />
    </div>
  );
};

const MediaGrid = ({ items }: { items: { url: string; type: 'image' | 'video' }[] }) => {
  const count = items.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 mt-3 max-h-[450px] sm:max-h-[550px] w-full">
        <MediaItem url={items[0].url} isVideo={items[0].type === 'video'} />
      </div>
    );
  }

  return (
    <div className={`grid gap-1 mt-3 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 h-[250px] sm:h-[380px] w-full ${
      count === 2 ? "grid-cols-2" : 
      count === 3 ? "grid-cols-2 grid-rows-2" : 
      "grid-cols-2 grid-rows-2"
    }`}>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} className={`${count === 3 && i === 0 ? "row-span-2" : ""} min-w-0 overflow-hidden`}>
          <MediaItem url={item.url} isVideo={item.type === 'video'} />
        </div>
      ))}
    </div>
  );
};

export const ContentRenderer: React.FC<ContentRendererProps> = ({ content, tags = [] }) => {
  const [showFull, setShowFull] = useState(false);
  const isLong = content.length > 600;
  const displayContent = isLong && !showFull ? content.slice(0, 500) + "…" : content;

  // Regex patterns
  const URL_REGEX = /https?:\/\/[^\s]+/gi;
  const HASHTAG_REGEX = /#\w+/g;
  const NOSTR_URI_REGEX = /(nostr:)?(npub1|note1|nevent1|naddr1|nprofile1)[0-9a-z]+/gi;
  const EMOJI_REGEX = /:(\w+):/g;
  const MENTION_REGEX = /#\[(\d+)\]/g;

  // Track quoted notes to avoid double rendering
  const quotedIds = new Set<string>();

  const tokens = useMemo(() => {
    const combinedRegex = new RegExp(
      `(${URL_REGEX.source})|(${HASHTAG_REGEX.source})|(${NOSTR_URI_REGEX.source})|(${EMOJI_REGEX.source})|(${MENTION_REGEX.source})`,
      "gi"
    );

    const result = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(displayContent)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: "text", value: displayContent.slice(lastIndex, match.index) });
      }

      const value = match[0];
      
      if (value.match(URL_REGEX)) {
        result.push({ type: "url", value });
      } else if (value.match(HASHTAG_REGEX)) {
        result.push({ type: "hashtag", value });
      } else if (value.match(NOSTR_URI_REGEX)) {
        result.push({ type: "nostr", value });
      } else if (value.match(EMOJI_REGEX)) {
        result.push({ type: "emoji", value });
      } else if (value.match(MENTION_REGEX)) {
        result.push({ type: "mention", value });
      }

      lastIndex = combinedRegex.lastIndex;
    }

    if (lastIndex < displayContent.length) {
      result.push({ type: "text", value: displayContent.slice(lastIndex) });
    }

    return result;
  }, [displayContent]);

  const mediaItems = useMemo(() => {
    return tokens
      .filter(t => t.type === "url")
      .map(t => {
        const url = t.value.replace(/[.,;]$/, "");
        if (url.match(IMAGE_REGEX)) return { url, type: 'image' as const };
        if (url.match(VIDEO_REGEX)) return { url, type: 'video' as const };
        return null;
      })
      .filter((item): item is { url: string; type: 'image' | 'video' } => item !== null);
  }, [tokens]);

  return (
    <div className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap leading-normal max-w-full overflow-hidden text-pretty">
      <div className="max-w-full min-w-0">
        {tokens.map((token, i) => {
          if (token.type === "url") {
            const cleanUrl = token.value.replace(/[.,;]$/, "");
            if (cleanUrl.match(IMAGE_REGEX) || cleanUrl.match(VIDEO_REGEX)) return null;
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

          if (token.type === "emoji") {
            const shortcode = token.value.slice(1, -1);
            const emojiTag = tags.find(t => t[0] === 'emoji' && t[1] === shortcode);
            if (emojiTag) {
              return (
                <img 
                  key={i} 
                  src={emojiTag[2]} 
                  alt={shortcode} 
                  title={shortcode}
                  className="inline-block w-5 h-5 object-contain vertical-align-middle mx-px" 
                />
              );
            }
            return <span key={i}>{token.value}</span>;
          }

          if (token.type === "mention") {
            const index = parseInt(token.value.slice(2, -1));
            const tag = tags[index];
            if (tag) {
              if (tag[0] === 'p') {
                return <Mention key={i} uri={tag[1]} />;
              }
              if (tag[0] === 'e' || tag[0] === 'a') {
                quotedIds.add(tag[1]);
                return (
                  <Link key={i} href={`/post/${tag[1]}`} className="text-blue-500 hover:underline break-all font-mono text-[10px] bg-gray-100 dark:bg-gray-900 px-1 rounded inline-block" onClick={(e) => e.stopPropagation()}>
                    {tag[1].slice(0, 8)}…
                  </Link>
                );
              }
            }
            return <span key={i}>{token.value}</span>;
          }

          return <span key={i}>{token.value}</span>;
        })}
        
        {isLong && !showFull && (
          <button 
            onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
            className="text-blue-500 hover:underline ml-1 font-bold text-sm block mt-1"
          >
            Show more
          </button>
        )}
      </div>

      {/* Quoted Section */}
      {Array.from(quotedIds).map((id) => (
        <div key={id} className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
          <QuoteRenderer id={id} />
        </div>
      ))}

      {/* Media Grid */}
      <MediaGrid items={mediaItems} />
    </div>
  );
};
