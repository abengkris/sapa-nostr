"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { QuoteRenderer } from "./QuoteRenderer";
import { Mention } from "./Mention";

interface ContentRendererProps {
  content: string;
}

export const ContentRenderer: React.FC<ContentRendererProps> = ({ content }) => {
  // Regex patterns
  const URL_REGEX = /https?:\/\/[^\s]+/gi;
  const HASHTAG_REGEX = /#\w+/g;
  const NOSTR_URI_REGEX = /(nostr:)?(npub1|note1|nevent1|naddr1|nprofile1)[0-9a-z]+/gi;
  const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
  const VIDEO_REGEX = /\.(mp4|webm|ogg)(\?.*)?$/i;

  // Track quoted notes to avoid double rendering
  const quotedIds = new Set<string>();

  // Tokenize the content to identify links, tags, and URIs
  const tokenize = (text: string) => {
    const combinedRegex = new RegExp(
      `(${URL_REGEX.source})|(${HASHTAG_REGEX.source})|(${NOSTR_URI_REGEX.source})`,
      "gi"
    );

    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = combinedRegex.exec(text)) !== null) {
      // Add text before the match
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

    // Add remaining text
    if (lastIndex < text.length) {
      tokens.push({ type: "text", value: text.slice(lastIndex) });
    }

    return tokens;
  };

  const tokens = tokenize(content);

  return (
    <div className="text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap leading-normal">
      <div>
        {tokens.map((token, i) => {
          if (token.type === "url") {
            const cleanUrl = token.value.replace(/[.,;]$/, "");
            if (cleanUrl.match(IMAGE_REGEX) || cleanUrl.match(VIDEO_REGEX)) {
              return null;
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
                  {uriWithoutScheme.slice(0, 12)}...{uriWithoutScheme.slice(-4)}
                </Link>
              );
            }
          }

          return <span key={i}>{token.value}</span>;
        })}
      </div>

      {/* Quoted Posts Section */}
      {Array.from(quotedIds).map((id) => (
        <div key={id} onClick={(e) => e.stopPropagation()}>
          <QuoteRenderer id={id} />
        </div>
      ))}

      {/* Media Section */}
      <div className="flex flex-col gap-2 mt-3">
        {tokens.filter(t => t.type === "url").map((token, i) => {
          const cleanUrl = token.value.replace(/[.,;]$/, "");
          
          if (cleanUrl.match(IMAGE_REGEX)) {
            return (
              <div key={i} className="relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[500px]" onClick={(e) => e.stopPropagation()}>
                <Image
                  src={cleanUrl}
                  alt="Post content"
                  width={800}
                  height={500}
                  className="w-full h-auto object-contain max-h-[500px]"
                  unoptimized
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
