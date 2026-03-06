"use client";

import React, { useState } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Image from "next/image";
import Link from "next/link";
import { Play, FileText, Image as ImageIcon } from "lucide-react";
import { tokenize, parseImeta } from "@/lib/content/tokenizer";
import { nip19 } from "nostr-tools";
import { Blurhash } from "react-blurhash";

interface MediaGridProps {
  posts: NDKEvent[];
  isLoading: boolean;
}

export function MediaGrid({ posts, isLoading }: MediaGridProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-1 sm:gap-4 p-1 sm:p-4 animate-pulse">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-4 p-1 sm:p-4">
      {posts.map((post) => (
        <MediaItem key={post.id} post={post} />
      ))}
    </div>
  );
}

function MediaItem({ post }: { post: NDKEvent }) {
  const [loaded, setLoaded] = useState(false);
  const media = React.useMemo(() => {
    // 1. Check imeta tags
    for (const tag of post.tags) {
      const meta = parseImeta(tag);
      if (meta && meta.url) {
        return { 
          url: meta.url, 
          type: meta.mimeType?.startsWith('video/') ? 'video' : 'image',
          blurhash: meta.blurhash
        };
      }
    }

    // 2. Check for NIP-94 (File Metadata) or Kind 20
    if (post.kind === 1063 || post.kind === 20) {
      const url = post.tags.find(t => t[0] === 'url')?.[1];
      const type = post.tags.find(t => t[0] === 'm')?.[1] || "";
      if (url) {
        return { 
          url, 
          type: type.startsWith('video') ? 'video' : (type.startsWith('audio') ? 'audio' : 'image'),
          blurhash: post.tags.find(t => t[0] === 'blurhash')?.[1]
        };
      }
    }

    // 3. Check kind 30023 image tag
    if (post.kind === 30023) {
      const image = post.tags.find(t => t[0] === 'image')?.[1];
      if (image) return { url: image, type: 'image', blurhash: undefined };
    }

    // 4. Tokenize content for media
    const tokens = tokenize(post.content);
    const firstMedia = tokens.find(t => t.type === 'image' || t.type === 'video');
    if (firstMedia) {
      return { url: firstMedia.value, type: firstMedia.type, blurhash: undefined };
    }

    return null;
  }, [post]);

  if (!media) return null;

  const href = post.kind === 30023 
    ? `/article/${nip19.naddrEncode({
        kind: 30023,
        pubkey: post.pubkey,
        identifier: post.tags.find(t => t[0] === 'd')?.[1] || ""
      })}`
    : `/post/${post.encode()}`;

  return (
    <Link 
      href={href}
      className="group relative aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-black"
    >
      {/* Placeholder: Blurhash */}
      {!loaded && media.blurhash && (
        <div className="absolute inset-0 z-0">
          <Blurhash
            hash={media.blurhash}
            width="100%"
            height="100%"
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </div>
      )}

      {media.type === 'video' ? (
        <div className="w-full h-full relative">
          <video src={media.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play fill="white" className="text-white" size={32} />
          </div>
        </div>
      ) : (
        <Image 
          src={media.url} 
          alt="" 
          fill 
          className={`object-cover transition-all duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          unoptimized 
        />
      )}
      
      {/* Overlay info */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
        {post.kind === 30023 && (
          <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-widest bg-blue-500 px-2 py-1 rounded-full mb-2">
            <FileText size={12} />
            <span>Article</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <ImageIcon size={14} />
          <span className="text-[10px] font-bold">View Post</span>
        </div>
      </div>
    </Link>
  );
}
