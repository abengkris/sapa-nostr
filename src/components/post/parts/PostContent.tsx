"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tokenize, Token, resolveDeprecatedMentions } from "@/lib/content/tokenizer";
import { MentionLink } from "../tokens/MentionLink";
import { HashtagLink } from "../tokens/HashtagLink";
import { ImageEmbed } from "../tokens/ImageEmbed";
import { VideoEmbed } from "../tokens/VideoEmbed";
import { QuoteEmbed } from "../tokens/QuoteEmbed";
import { LightningCard } from "../tokens/LightningCard";
import { CashuCard } from "../tokens/CashuCard";
import { ShortenedUrl } from "../tokens/ShortenedUrl";
import { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";

interface PostContentRendererProps {
  content: string;
  event: NDKEvent;
  renderMedia?: boolean;
  renderQuotes?: boolean;
  maxLines?: number;
  className?: string;
  replyingToNpub?: string | null;
  isRepost?: boolean;
}

export function PostContentRenderer({
  content,
  event,
  renderMedia = true,
  renderQuotes = true,
  maxLines,
  className = "",
  replyingToNpub,
  isRepost,
}: PostContentRendererProps) {
  const [showFull, setShowFull] = useState(false);
  const isLong = content.length > 600;

  // 1. Resolve deprecated NIP-08 mentions first
  const normalizedContent = useMemo(() => 
    resolveDeprecatedMentions(content, event.tags), 
  [content, event.tags]);

  // 2. Parse custom emojis into a map
  const emojiMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const tag of event.tags) {
      if (tag[0] === "emoji" && tag[1] && tag[2]) {
        map.set(`:${tag[1]}:`, tag[2]);
      }
    }
    return map;
  }, [event.tags]);

  // 3. Tokenize the normalized content
  const tokens = useMemo(() => tokenize(normalizedContent), [normalizedContent]);

  // 4. Separate tokens for tiered rendering
  const textTokens: Token[] = [];
  const mediaTokens: Token[] = [];
  const quoteTokens: Token[] = [];
  const cardTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "image" || token.type === "video") {
      mediaTokens.push(token);
    } else if (token.type === "note_ref" && renderQuotes) {
      quoteTokens.push(token);
    } else if (token.type === "lightning" || token.type === "cashu") {
      cardTokens.push(token);
    } else {
      textTokens.push(token);
    }
  }

  // Trim trailing whitespace from textTokens
  while (
    textTokens.length > 0 &&
    (textTokens[textTokens.length - 1].type === "linebreak" ||
      textTokens[textTokens.length - 1].value.trim() === "")
  ) {
    textTokens.pop();
  }

  return (
    <div className={`flex flex-col min-w-0 max-w-full overflow-hidden ${className}`}>
      {/* Replying to label */}
      {replyingToNpub && !isRepost && (
        <div className="text-gray-500 text-xs mb-1" onClick={(e) => e.stopPropagation()}>
          Replying to <span className="text-blue-500 hover:underline">@{replyingToNpub.slice(0, 12)}…</span>
        </div>
      )}

      {/* Main Text Content */}
      {textTokens.length > 0 && (
        <div
          className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 text-pretty min-w-0 ${
            maxLines && !showFull ? `line-clamp-${maxLines}` : ""
          }`}
        >
          {textTokens.map((token, i) => (
            <TokenRenderer key={i} token={token} emojiMap={emojiMap} />
          ))}
          
          {isLong && !showFull && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowFull(true); }}
              className="text-blue-500 hover:underline ml-1 font-bold text-sm"
            >
              Show more
            </button>
          )}
        </div>
      )}

      {/* Payment Cards (Lightning/Cashu) */}
      {cardTokens.length > 0 && (
        <div className="space-y-1">
          {cardTokens.map((token, i) => (
            token.type === "lightning" 
              ? <LightningCard key={i} invoice={token.value} />
              : <CashuCard key={i} token={token.value} />
          ))}
        </div>
      )}

      {/* Media — image/video below text */}
      {renderMedia && mediaTokens.length > 0 && (
        <div className="space-y-2 w-full">
          {mediaTokens.map((token, i) =>
            token.type === "image" ? (
              <ImageEmbed key={i} url={token.value} />
            ) : (
              <VideoEmbed key={i} url={token.value} />
            )
          )}
        </div>
      )}

      {/* Quote embeds — bottom */}
      {renderQuotes && quoteTokens.map((token, i) => (
        <QuoteEmbed
          key={i}
          eventId={token.decoded?.eventId ?? ""}
        />
      ))}
    </div>
  );
}

function TokenRenderer({ token, emojiMap }: { token: Token; emojiMap: Map<string, string> }) {
  switch (token.type) {
    case "text": {
      // Split text by :shortcode: for custom emojis
      const parts = token.value.split(/(:[a-zA-Z0-9_]+:)/g);
      return (
        <>
          {parts.map((part, i) => {
            const emojiUrl = emojiMap.get(part);
            if (emojiUrl) {
              return (
                <img
                  key={i}
                  src={emojiUrl}
                  alt={part}
                  className="inline-block w-5 h-5 align-middle mx-0.5"
                  loading="lazy"
                />
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </>
      );
    }

    case "linebreak":
      return <br />;

    case "mention":
      return (
        <MentionLink
          pubkey={token.decoded?.pubkey ?? ""}
          raw={token.value}
        />
      );

    case "hashtag":
      return <HashtagLink tag={token.value.slice(1)} />;

    case "url":
      return <ShortenedUrl url={token.value} />;

    case "note_ref":
    case "naddr_ref":
      return (
        <Link
          href={`/post/${token.decoded?.eventId || token.value}`}
          className="text-blue-500 hover:text-blue-600 hover:underline font-mono text-sm"
          onClick={e => e.stopPropagation()}
        >
          {token.value.slice(0, 20)}…
        </Link>
      );

    default:
      return null;
  }
}
