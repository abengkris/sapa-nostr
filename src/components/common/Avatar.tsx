"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useBlossom } from "@/hooks/useBlossom";

interface AvatarProps {
  pubkey: string;
  src?: string;
  size?: number;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ pubkey, src, size = 40, className = "" }) => {
  const { getOptimizedUrl } = useBlossom();
  
  const getFallbackUrl = () => `https://robohash.org/${pubkey}?set=set1`;

  // Use a derived initial state
  const getInitialUrl = () => {
    if (!src) return getFallbackUrl();
    if (src.startsWith('data:')) return src;
    return src;
  };

  const [avatarUrl, setAvatarUrl] = useState<string>(getInitialUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    
    if (!src) {
      setAvatarUrl(getFallbackUrl());
      return;
    }
    
    if (src.startsWith('data:')) {
      setAvatarUrl(src);
      return;
    }

    setAvatarUrl(src);

    // Attempt optimization
    let isMounted = true;
    getOptimizedUrl(src, { width: size * 2, height: size * 2, format: 'webp' })
      .then(url => {
        if (isMounted && url && url !== src) {
          setAvatarUrl(url);
        }
      })
      .catch(() => {
        // Silent catch, keep original src
      });
      
    return () => { isMounted = false; };
  }, [src, pubkey, size, getOptimizedUrl]);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setAvatarUrl(getFallbackUrl());
    }
  };

  return (
    <div 
      className={`relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        className="object-cover w-full h-full"
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
};
