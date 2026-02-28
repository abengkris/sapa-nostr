"use client";

import React, { useMemo } from "react";

export function ShortenedUrl({ url }: { url: string }) {
  const display = useMemo(() => {
    try {
      const u = new URL(url);
      const full = u.hostname + u.pathname;
      return full.length > 40 ? full.slice(0, 37) + "…" : full;
    } catch {
      return url.slice(0, 40) + "…";
    }
  }, [url]);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-600 hover:underline break-all"
      onClick={e => e.stopPropagation()}
    >
      {display}
    </a>
  );
}
