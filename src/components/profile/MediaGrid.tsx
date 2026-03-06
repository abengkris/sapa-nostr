"use client";

import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Image from "next/image";
import Link from "next/link";
import { Play, FileText, Image as ImageIcon } from "lucide-react";
import { tokenize } from "@/lib/content/tokenizer";
import { nip19 } from "nostr-tools";

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
  const media = React.useMemo(() => {
    // 1. Check for NIP-94 (File Metadata) or Kind 20
    if (post.kind === 1063 || post.kind === 20) {
      const url = post.tags.find(t => t[0] === 'url')?.[1];
      const type = post.tags.find(t => t[0] === 'm')?.[1] || "";
      if (url) {
        return { 
          url, 
          type: type.startsWith('video') ? 'video' : (type.startsWith('audio') ? 'audio' : 'image') 
        };
      }
    }

    // 2. Check kind 30023 image tag
    if (post.kind === 30023) {
      const image = post.tags.find(t => t[0] === 'image')?.[1];
      if (image) return { url: image, type: 'image' };
    }

    // 3. Tokenize content for media
    const tokens = tokenize(post.content);
    const firstMedia = tokens.find(t => t.type === 'image' || t.type === 'video');
    if (firstMedia) {
      return { url: firstMedia.value, type: firstMedia.type };
    }

    // 4. Check imeta tags
    const imeta = post.tags.find(t => t[0] === 'imeta');
    if (imeta) {
      const urlPart = imeta.find(p => p.startsWith('url '));
      if (urlPart) return { url: urlPart.split(' ')[1], type: 'image' };
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
          className="object-cover transition-transform group-hover:scale-105"
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
