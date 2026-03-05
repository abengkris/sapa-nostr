"use client";

import { useEffect, useState } from "react";
import { ImageEmbed } from "./ImageEmbed";
import { VideoEmbed } from "./VideoEmbed";
import { ImetaData } from "@/lib/content/tokenizer";
import { useBlossom } from "@/hooks/useBlossom";

export function AsyncMediaEmbed({ url, imeta, pubkey }: { url: string; imeta?: ImetaData; pubkey?: string }) {
  const [type, setType] = useState<'image' | 'video' | 'url' | 'loading'>('loading');
  const [displayUrl, setDisplayUrl] = useState(url);
  const { fixUrl } = useBlossom();

  useEffect(() => {
    let isMounted = true;

    const resolveAndCheck = async () => {
      let currentUrl = url;
      
      // Try to heal URL if it's potentially a Blossom blob
      if (pubkey) {
        const healed = await fixUrl(pubkey, url);
        if (healed && healed !== url) {
          currentUrl = healed;
          if (isMounted) setDisplayUrl(healed);
        }
      }

      // If imeta already specifies type, use it
      if (imeta?.mimeType?.startsWith('image/')) {
        if (isMounted) setType('image');
        return;
      }
      if (imeta?.mimeType?.startsWith('video/')) {
        if (isMounted) setType('video');
        return;
      }

      try {
        const res = await fetch(currentUrl, { method: 'HEAD' });
        const contentType = res.headers.get('content-type');
        
        if (isMounted) {
          if (contentType?.startsWith('image/')) setType('image');
          else if (contentType?.startsWith('video/')) setType('video');
          else setType('url');
        }
      } catch (err) {
        if (isMounted) setType('url');
      }
    };

    resolveAndCheck();
    
    return () => { isMounted = false; };
  }, [url, imeta, pubkey, fixUrl]);

  if (type === 'loading') return null;
  if (type === 'image') return <ImageEmbed url={displayUrl} imeta={imeta} />;
  if (type === 'video') return <VideoEmbed url={displayUrl} />;
  
  return null; 
}
