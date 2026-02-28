import { useEffect, useState, useRef, useCallback } from "react";
import NDK, { NDKEvent, NDKFilter, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";

export interface NotificationEvent extends NDKEvent {
  type: 'reply' | 'mention' | 'like' | 'repost' | 'zap';
}

export function useNotifications() {
  const { ndk, isReady } = useNDK();
  const { user, isLoggedIn } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const subscriptionRef = useRef<NDKSubscription | null>(null);
  const oldestTimestampRef = useRef<number | undefined>(undefined);

  const fetchNotifications = useCallback(async (isLoadMore = false) => {
    if (!ndk || !isReady || !isLoggedIn || !user) return;

    setLoading(true);

    const filter: NDKFilter = {
      kinds: [1, 6, 7, 9735],
      "#p": [user.pubkey],
      limit: 20,
    };

    if (isLoadMore && oldestTimestampRef.current) {
      filter.until = oldestTimestampRef.current - 1;
    }

    const sub = ndk.subscribe(
      filter, 
      { 
        closeOnEose: true, 
        groupable: false, 
        cacheUnconstrainFilter: ["limit"],
        onEvent: (event: NDKEvent) => {
          if (event.pubkey === user.pubkey) return;

          const notif = event as NotificationEvent;
          if (event.kind === 1) {
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
            const newNotifs = [...prev, notif].sort(
              (a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)
            );
            
            if (newNotifs.length > 0) {
              oldestTimestampRef.current = newNotifs[newNotifs.length - 1].created_at;
            }
            
            return newNotifs;
          });
        },
        onEose: () => {
          setLoading(false);
        }
      }
    );
  }, [ndk, isReady, isLoggedIn, user]);

  useEffect(() => {
    if (!ndk || !isReady || !isLoggedIn || !user) return;

    // Real-time listener for NEW notifications
    const filter: NDKFilter = {
      kinds: [1, 6, 7, 9735],
      "#p": [user.pubkey],
      since: Math.floor(Date.now() / 1000),
    };

    const sub = ndk.subscribe(
      filter,
      { 
        closeOnEose: false, 
        groupableDelay: 200,
        onEvent: (event: NDKEvent) => {
          if (event.pubkey === user.pubkey) return;

          const notif = event as NotificationEvent;
          if (event.kind === 1) {
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
            return [notif, ...prev].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
          });

          setUnreadCount((prev) => prev + 1);
        }
      }
    );
    subscriptionRef.current = sub;

    // Initial fetch
    fetchNotifications();

    return () => {
      sub.stop();
    };
  }, [ndk, isReady, isLoggedIn, user?.pubkey, fetchNotifications]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(true);
    }
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, loading, loadMore, hasMore };
}
