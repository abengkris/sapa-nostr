"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tokenize, Token } from "@/lib/content/tokenizer";
import { MentionLink } from "../tokens/MentionLink";
import { HashtagLink } from "../tokens/HashtagLink";
import { ImageEmbed } from "../tokens/ImageEmbed";
import { VideoEmbed } from "../tokens/VideoEmbed";
import { QuoteEmbed } from "../tokens/QuoteEmbed";
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
  const displayContent = isLong && !showFull ? content.slice(0, 500) + "…" : content;

  const tokens = useMemo(() => tokenize(displayContent), [displayContent]);

  // Pisahkan media tokens — akan dirender di bawah teks, bukan inline
  const textTokens: Token[] = [];
  const mediaTokens: Token[] = [];
  const quoteTokens: Token[] = [];

  for (const token of tokens) {
    if (token.type === "image" || token.type === "video") {
      mediaTokens.push(token);
    } else if (token.type === "note_ref" && renderQuotes) {
      quoteTokens.push(token);
    } else {
      textTokens.push(token);
    }
  }

  // Trim trailing whitespace/linebreak
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

      {/* Teks utama */}
      {textTokens.length > 0 && (
        <div
          className={`text-[15px] leading-relaxed whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 text-pretty min-w-0 ${
            maxLines && !showFull ? `line-clamp-${maxLines}` : ""
          }`}
        >
          {textTokens.map((token, i) => (
            <TokenRenderer key={i} token={token} tags={event.tags} />
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

      {/* Media — gambar/video di bawah teks */}
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

      {/* Quote embeds — paling bawah */}
      {renderQuotes && quoteTokens.map((token, i) => (
        <QuoteEmbed
          key={i}
          eventId={token.decoded?.eventId ?? ""}
        />
      ))}
    </div>
  );
}

function TokenRenderer({ token, tags }: { token: Token; tags: NDKTag[] }) {
  switch (token.type) {
    case "text":
      return <span>{token.value}</span>;

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

    case "emoji": {
      const shortcode = token.value.slice(1, -1);
      const emojiTag = tags.find(t => t[0] === 'emoji' && t[1] === shortcode);
      if (emojiTag) {
        return (
          <img 
            src={emojiTag[2]} 
            alt={shortcode} 
            title={shortcode}
            className="inline-block w-5 h-5 object-contain vertical-align-middle mx-px" 
          />
        );
      }
      return <span>{token.value}</span>;
    }

    case "nip08": {
      const index = parseInt(token.value.slice(2, -1));
      const tag = tags[index];
      if (tag) {
        if (tag[0] === 'p') {
          return <MentionLink pubkey={tag[1]} raw={token.value} />;
        }
        if (tag[0] === 'e' || tag[0] === 'a') {
          return (
            <Link
              href={`/post/${tag[1]}`}
              className="text-blue-500 hover:text-blue-600 hover:underline font-mono text-sm"
              onClick={e => e.stopPropagation()}
            >
              {tag[1].slice(0, 12)}…
            </Link>
          );
        }
      }
      return <span>{token.value}</span>;
    }

    case "url":
      return (
        <a
          href={token.value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 hover:underline break-all"
          onClick={e => e.stopPropagation()}
        >
          {shortenUrl(token.value)}
        </a>
      );

    case "note_ref":
      return (
        <Link
          href={`/post/${token.decoded?.eventId}`}
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

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 20
      ? u.pathname.slice(0, 20) + "…"
      : u.pathname;
    return u.hostname + path;
  } catch {
    return url.slice(0, 40) + "…";
  }
}
