import { useState, useEffect } from "react";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";

/**
 * Hook to fetch and count reactions for a specific event ID.
 * @param eventId The hex ID of the event
 */
export function useReactions(eventId?: string) {
  const { ndk, isReady } = useNDK();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [reposts, setReposts] = useState(0);
  const [userReacted, setUserReacted] = useState<string | null>(null);

  useEffect(() => {
    if (!ndk || !isReady || !eventId) return;

    const filter: NDKFilter = {
      kinds: [6, 7], // Repost and Reaction
      "#e": [eventId],
    };

    const sub = ndk.subscribe(
      filter,
      { 
        closeOnEose: false, 
        groupableDelay: 500, // Wait up to 500ms to group multiple PostCard reaction requests
        groupableDelayType: "at-most",
        onEvent: (event: NDKEvent) => {
          if (event.kind === 7) {
            if (event.content === "+" || event.content === "") {
              setLikes((prev) => prev + 1);
            } else if (event.content === "-") {
              setDislikes((prev) => prev + 1);
            }
          } else if (event.kind === 6) {
            setReposts((prev) => prev + 1);
          }

          // Track if current user has reacted
          if (ndk.signer) {
            ndk.signer.user().then(user => {
              if (user && event.pubkey === user.pubkey) {
                if (event.kind === 7) {
                  setUserReacted(event.content || "+");
                }
              }
            });
          }
        }
      }
    );

    return () => sub.stop();
  }, [ndk, isReady, eventId]);

  return { likes, dislikes, reposts, userReacted };
}
