"use client";

import { useState, useMemo } from "react";
import { ImetaData } from "@/lib/content/tokenizer";
import { useBlossom } from "@/hooks/useBlossom";

export function ImageEmbed({ url, imeta }: { url: string; imeta?: ImetaData }) {
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
      className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 max-h-[450px] sm:max-h-[550px] border border-gray-200 dark:border-gray-800 w-full mt-3"
      style={{ aspectRatio }}
    >
      {/* Skeleton loading */}
      {!loaded && (
        <div className="w-full h-full min-h-[150px] animate-pulse bg-gray-200 dark:bg-gray-800" />
      )}

      <img
        src={optimizedUrl}
        alt={imeta?.alt || "Post media"}
        className={`w-full h-auto max-h-[450px] sm:max-h-[550px] object-contain transition-opacity duration-300 block mx-auto ${
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
