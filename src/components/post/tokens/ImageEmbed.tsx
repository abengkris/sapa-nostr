"use client";

import { useState } from "react";
import { ImetaData } from "@/lib/content/tokenizer";

export function ImageEmbed({ url, imeta }: { url: string; imeta?: ImetaData }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
        src={url}
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
