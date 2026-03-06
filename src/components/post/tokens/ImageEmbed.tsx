"use client";

import { useState, useMemo } from "react";
import { ImetaData } from "@/lib/content/tokenizer";
import { useBlossom } from "@/hooks/useBlossom";

export function ImageEmbed({ 
  url, 
  imeta, 
  className = "", 
  noMargin = false 
}: { 
  url: string; 
  imeta?: ImetaData;
  className?: string;
  noMargin?: boolean;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { getOptimizedUrl } = useBlossom();

  // Request an optimized version if it's a Blossom URL
  const optimizedUrl = useMemo(() => {
    if (url.startsWith('data:')) return url;
    return getOptimizedUrl(url, { width: 1200, format: 'webp', quality: 85 });
  }, [url, getOptimizedUrl]);

  if (error) return null;

  const aspectRatio = imeta?.dimensions 
    ? `${imeta.dimensions.w} / ${imeta.dimensions.h}`
    : undefined;

  return (
    <div 
      className={`relative overflow-hidden bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full ${!noMargin ? 'rounded-2xl mt-3' : ''} ${className}`}
      style={{ aspectRatio, maxHeight: noMargin ? 'none' : undefined }}
    >
      {/* Skeleton loading */}
      {!loaded && (
        <div className="w-full h-full min-h-[150px] animate-pulse bg-gray-200 dark:bg-gray-800" />
      )}

      <img
        src={optimizedUrl}
        alt={imeta?.alt || "Post media"}
        className={`w-full h-full object-cover transition-opacity duration-300 block mx-auto ${
          loaded ? "opacity-100" : "opacity-0 absolute inset-0"
        }`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        onClick={e => {
          e.stopPropagation();
          window.open(url, "_blank");
        }}
      />
    </div>
  );
}
