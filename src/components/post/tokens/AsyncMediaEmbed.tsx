"use client";

import { useEffect, useState } from "react";
import { ImageEmbed } from "./ImageEmbed";
import { VideoEmbed } from "./VideoEmbed";
import { ImetaData } from "@/lib/content/tokenizer";

export function AsyncMediaEmbed({ url, imeta }: { url: string; imeta?: ImetaData }) {
  const [type, setType] = useState<'image' | 'video' | 'url' | 'loading'>('loading');

  useEffect(() => {
    // If imeta already specifies type, use it
    if (imeta?.mimeType?.startsWith('image/')) {
      setType('image');
      return;
    }
    if (imeta?.mimeType?.startsWith('video/')) {
      setType('video');
      return;
    }

    const checkMime = async () => {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        const contentType = res.headers.get('content-type');
        
        if (contentType?.startsWith('image/')) setType('image');
        else if (contentType?.startsWith('video/')) setType('video');
        else setType('url');
      } catch (err) {
        setType('url');
      }
    };

    checkMime();
  }, [url, imeta]);

  if (type === 'loading') return null;
  if (type === 'image') return <ImageEmbed url={url} imeta={imeta} />;
  if (type === 'video') return <VideoEmbed url={url} />;
  
  return null; 
}
