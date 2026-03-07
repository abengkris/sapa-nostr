"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";
import { NDKMessage } from "@nostr-dev-kit/messages";
import { mapNDKMessage } from "@/lib/utils/messages";

export function useChat(targetPubkey: string) {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const { setActiveChatPubkey } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChatMessages = useCallback(async () => {
    if (!messenger || !user || !targetPubkey || !ndk) return;

    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      if (conv) {
        const events = await conv.getMessages();
        const mapped = events
          .map(msg => mapNDKMessage(msg, ndk))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [messenger, user, targetPubkey, ndk]);

  useEffect(() => {
    if (!messenger || !isReady || !user || !targetPubkey) return;

    setActiveChatPubkey(targetPubkey);
    fetchChatMessages();

    // Listen for new messages for this specific conversation
    const handleMessage = async (message: NDKMessage) => {
      // Robust sender/recipient detection using the shared logic via mapNDKMessage
      const mapped = mapNDKMessage(message, ndk);
      
      if (mapped.sender === targetPubkey || mapped.recipient === targetPubkey) {
        setMessages(prev => {
          if (prev.find(m => m.id === mapped.id)) return prev;
          return [...prev, mapped].sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    };

    messenger.on("message", handleMessage);
    
    return () => {
      setActiveChatPubkey(null);
      messenger.off("message", handleMessage);
    };
  }, [messenger, isReady, user, targetPubkey, fetchChatMessages, ndk, setActiveChatPubkey]);

  return { messages, loading, user, refresh: fetchChatMessages };
}
