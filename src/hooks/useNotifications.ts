import { useEffect, useState, useRef } from "react";
import NDK, { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/lib/ndk";

export interface NotificationEvent extends NDKEvent {
  type: 'reply' | 'mention' | 'like' | 'repost' | 'zap';
}

export function useNotifications() {
  const { ndk, isReady } = useNDK();
  const { user, isLoggedIn } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<NDKSubscription | null>(null);

  useEffect(() => {
    if (!ndk || !isReady || !isLoggedIn || !user) return;

    // Filter for interactions: Mentions, Replies, Likes, Reposts, Zaps
    // Most of these tag the recipient's pubkey in a 'p' tag
    const filter: NDKFilter = {
      kinds: [1, 6, 7, 9735],
      "#p": [user.pubkey],
      limit: 50,
    };

    const sub = ndk.subscribe(filter, { closeOnEose: false });
    subscriptionRef.current = sub;

    sub.on("event", (event: NDKEvent) => {
      // Don't notify about own actions
      if (event.pubkey === user.pubkey) return;

      const notif = event as NotificationEvent;
      
      // Determine type
      if (event.kind === 1) {
        // Check if it's a reply (has e tag) or just a mention
        const isReply = event.tags.some(t => t[0] === 'e');
        notif.type = isReply ? 'reply' : 'mention';
      } else if (event.kind === 6) {
        notif.type = 'repost';
      } else if (event.kind === 7) {
        notif.type = 'like';
      } else if (event.kind === 9735) {
        notif.type = 'zap';
      }

      setNotifications((prev) => {
        if (prev.find((n) => n.id === notif.id)) return prev;
        const newNotifs = [notif, ...prev].sort(
          (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
        );
        return newNotifs;
      });

      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      sub.stop();
    };
  }, [ndk, isReady, isLoggedIn, user?.pubkey]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead };
}
