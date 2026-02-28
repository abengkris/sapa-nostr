import { useState, useEffect } from "react";
import { useNDK } from "@/lib/ndk";
import { NDKEvent } from "@nostr-dev-kit/ndk";

export function useWoT(rootPubkey?: string, depth: number = 2) {
  const { ndk, isReady } = useNDK();
  const [wotPubkeys, setWoTPubkeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ndk || !isReady || !rootPubkey) return;

    const buildWoT = async () => {
      setLoading(true);
      try {
        const discovered = new Set<string>([rootPubkey]);
        let currentLevel = [rootPubkey];

        for (let d = 0; d < depth; d++) {
          const nextLevel: string[] = [];
          
          // To prevent massive queries, limit the breadth of crawling
          // We only crawl the first 50 contacts of each user at each level
          const authorsToCrawl = currentLevel.slice(0, 50);
          
          if (authorsToCrawl.length === 0) break;

          const contactEvents = await ndk.fetchEvents(
            {
              kinds: [3],
              authors: authorsToCrawl,
            },
            {
              groupable: true,
              groupableDelay: 500,
              groupableDelayType: "at-most"
            }
          );

          for (const event of contactEvents) {
            const pTags = event.tags.filter(t => t[0] === 'p').map(t => t[1]);
            for (const pubkey of pTags) {
              if (!discovered.has(pubkey)) {
                discovered.add(pubkey);
                nextLevel.push(pubkey);
              }
            }
          }
          
          currentLevel = nextLevel;
          // Safety break if WoT gets too large for simple filters
          if (discovered.size > 1000) break;
        }

        setWoTPubkeys(Array.from(discovered));
      } catch (err) {
        console.error("Error building WoT:", err);
      } finally {
        setLoading(false);
      }
    };

    buildWoT();
  }, [ndk, isReady, rootPubkey, depth]);

  return { wotPubkeys, loading };
}
