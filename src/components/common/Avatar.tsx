"use client";

import Image from "next/image";
import React, { useMemo } from "react";
import { useBlossom } from "@/hooks/useBlossom";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ pubkey, src, size = 40, className = "" }) => {
  const { getOptimizedUrl } = useBlossom();

  const avatarUrl = useMemo(() => {
    if (!src) return `https://robohash.org/${pubkey}?set=set1`;
    if (src.startsWith('data:')) return src;
    
    // Request optimized avatar at 2x size for high-DPI displays
    return getOptimizedUrl(src, { width: size * 2, height: size * 2, format: 'webp' });
  }, [src, pubkey, size, getOptimizedUrl]);

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="object-cover w-full h-full"
        unoptimized
      />
    </div>
  );
};
