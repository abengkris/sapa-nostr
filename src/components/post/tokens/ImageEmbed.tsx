"use client";

import { useState } from "react";

export function ImageEmbed({ url }: { url: string }) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-900 max-h-[450px] sm:max-h-[550px] border border-gray-200 dark:border-gray-800 w-full mt-3">
      {/* Skeleton loading */}
      {!loaded && (
        <div className="w-full h-48 animate-pulse bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      )}

      <img
        src={url}
        alt="Post media"
        className={`w-full h-auto max-h-[450px] sm:max-h-[550px] object-contain rounded-2xl transition-opacity duration-300 block mx-auto ${
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
