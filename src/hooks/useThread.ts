import { useState, useEffect, useCallback } from "react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";

export function useThread(focalId?: string) {
  const { ndk, isReady } = useNDK();
  const [focalPost, setFocalPost] = useState<NDKEvent | null>(null);
  const [ancestors, setAncestors] = useState<NDKEvent[]>([]);
  const [replies, setReplies] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchThread = useCallback(async () => {
    if (!ndk || !isReady || !focalId) return;

    setLoading(true);
    try {
      // 1. Fetch the focal post
      const focal = await ndk.fetchEvent(focalId);
      if (!focal) {
        setLoading(false);
        return;
      }
      setFocalPost(focal);

      // 2. Build Ancestor Chain (Recursive Upwards)
      const chain: NDKEvent[] = [];
      let currentEvent = focal;
      const visited = new Set<string>([focal.id]);

      for (let i = 0; i < 10; i++) {
        // Find the parent ID from tags
        const parentId = currentEvent.tags.find(t => t[0] === 'e' && t[3] === 'reply')?.[1] || 
                         currentEvent.tags.find(t => t[0] === 'e' && t[3] === 'root')?.[1] ||
                         currentEvent.tags.find(t => t[0] === 'e')?.[1];

        if (!parentId || visited.has(parentId)) break;
        
        visited.add(parentId);
        const parent = await ndk.fetchEvent(parentId);
        if (!parent) break;
        
        chain.unshift(parent); // Add to beginning to keep root -> parent order
        currentEvent = parent;
      }
      setAncestors(chain);

      // 3. Fetch Direct Replies (Downwards)
      const filter: NDKFilter = {
        kinds: [1],
        "#e": [focalId],
      };
      const replyEvents = await ndk.fetchEvents(filter);
      
      // Filter only direct replies to avoid showing "replies of replies" in the first level
      const directReplies = Array.from(replyEvents)
        .filter(ev => {
          const replyTag = ev.tags.find(t => t[0] === 'e' && t[3] === 'reply');
          if (replyTag) return replyTag[1] === focalId;
          // Fallback for old clients: last e tag is the reply parent
          const eTags = ev.tags.filter(t => t[0] === 'e');
          return eTags[eTags.length - 1]?.[1] === focalId;
        })
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      
      setReplies(directReplies);
    } catch (err) {
      console.error("Thread fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [ndk, isReady, focalId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  return { focalPost, ancestors, replies, loading };
}
