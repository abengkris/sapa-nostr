"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "@/hooks/useMessages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { NDKEvent, NDKUser, NostrEvent } from "@nostr-dev-kit/ndk";
import { NDKMessage } from "@nostr-dev-kit/messages";

export function useChat(targetPubkey: string) {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const { setActiveChatPubkey } = useUIStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const mapNDKMessage = useCallback((ndkMessage: NDKMessage): Message => {
    // NDKMessage might have .event (NDKEvent) or just be a plain object with rumor data
    let event = (ndkMessage as unknown as { event?: NDKEvent }).event;
    
    // If no event instance, create one from rumor or the message itself
    if (!event || !(event instanceof NDKEvent)) {
      const rumor = (ndkMessage.rumor as NostrEvent) || (ndkMessage as unknown as NostrEvent);
      event = new NDKEvent(ndk || undefined);
      event.id = ndkMessage.id || rumor.id || "";
      event.pubkey = ndkMessage.sender.pubkey || rumor.pubkey || "";
      event.content = ndkMessage.content || rumor.content || "";
      event.created_at = ndkMessage.timestamp || rumor.created_at || 0;
      event.kind = rumor.kind || 14;
      event.tags = rumor.tags || [];
    }

    const sender = ndkMessage.sender.pubkey || event.pubkey || "";
    const recipient = ndkMessage.recipient?.pubkey || (event.getMatchingTags ? event.getMatchingTags("p")[0]?.[1] : "");
    
    return {
      id: ndkMessage.id || event.id,
      sender: sender,
      recipient: recipient,
      content: ndkMessage.content || event.content,
      timestamp: ndkMessage.timestamp || event.created_at || 0,
      event: event,
      isRead: true
    };
  }, [ndk]);

  const fetchChatMessages = useCallback(async () => {
    if (!messenger || !user || !targetPubkey || !ndk) return;

    try {
      const recipientUser = ndk.getUser({ pubkey: targetPubkey });
      const conv = await messenger.getConversation(recipientUser);
      if (conv) {
        const events = await conv.getMessages();
        const mapped = events
          .map(msg => mapNDKMessage(msg))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(mapped);
      }
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    } finally {
      setLoading(false);
    }
  }, [messenger, user, targetPubkey, ndk, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user || !targetPubkey) return;

    setActiveChatPubkey(targetPubkey);
    fetchChatMessages();

    // Listen for new messages for this specific conversation
    const handleMessage = async (message: NDKMessage) => {
      // Robust sender/recipient detection
      const sender = message.sender.pubkey;
      const recipient = message.recipient?.pubkey || 
                        message.rumor?.tags.find(t => t[0] === 'p')?.[1] || 
                        "";
      
      if (sender === targetPubkey || recipient === targetPubkey) {
        const mapped = mapNDKMessage(message);
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
  }, [messenger, isReady, user, targetPubkey, fetchChatMessages, mapNDKMessage, setActiveChatPubkey]);

  return { messages, loading, user, refresh: fetchChatMessages };
}
