"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { NDKMessenger, NDKMessage, NDKConversation } from "@nostr-dev-kit/messages";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";

export interface Message {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  event: NDKEvent;
  isRead: boolean;
}

export interface Conversation {
  pubkey: string;
  lastMessage: Message;
  messages: Message[];
  unreadCount: number;
}

export function useMessages() {
  const { messenger, isReady, ndk } = useNDK();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Map<string, Conversation>>(new Map());
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

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
      isRead: ndkMessage.read ?? true
    };
  }, [ndk]);

  const fetchConversations = useCallback(async () => {
    if (!messenger || !user) return;

    try {
      const ndkConversations = await messenger.getConversations();
      const next = new Map<string, Conversation>();

      for (const conv of ndkConversations) {
        const participants = Array.from(conv.participants);
        const chatPartnerUser = participants.find(p => {
          const pPubkey = typeof p === "string" ? p : p.pubkey;
          return pPubkey !== user.pubkey;
        });

        if (!chatPartnerUser) continue;
        const chatPartnerPubkey = typeof chatPartnerUser === "string" ? chatPartnerUser : chatPartnerUser.pubkey;

        const events = await conv.getMessages();
        if (events.length === 0) continue;

        const messages = events
          .map(msg => mapNDKMessage(msg))
          .sort((a, b) => b.timestamp - a.timestamp);
        
        const unreadCount = conv.getUnreadCount ? conv.getUnreadCount() : 0;

        next.set(chatPartnerPubkey, {
          pubkey: chatPartnerPubkey,
          messages: messages,
          lastMessage: messages[0],
          unreadCount,
        });
      }

      setConversations(next);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [messenger, user, mapNDKMessage]);

  useEffect(() => {
    if (!messenger || !isReady || !user) return;

    if (isInitialLoad.current) {
      setLoading(true);
      fetchConversations().finally(() => {
        setLoading(false);
        isInitialLoad.current = false;
      });
    }

    const handleMessage = async (message: NDKMessage) => {
      // Find which conversation this message belongs to
      const otherPubkey = message.sender.pubkey === user.pubkey 
        ? message.recipient?.pubkey 
        : message.sender.pubkey;
      
      if (!otherPubkey) {
        // Fallback to full refresh if we can't determine the partner
        await fetchConversations();
        return;
      }

      // Update that specific conversation in the map
      const recipientUser = ndk?.getUser({ pubkey: otherPubkey });
      if (!recipientUser) return;

      const conv = await messenger.getConversation(recipientUser);
      if (!conv) return;

      const events = await conv.getMessages();
      const messages = events
        .map(msg => mapNDKMessage(msg))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      const unreadCount = conv.getUnreadCount ? conv.getUnreadCount() : 0;

      setConversations(prev => {
        const next = new Map(prev);
        next.set(otherPubkey, {
          pubkey: otherPubkey,
          messages,
          lastMessage: messages[0],
          unreadCount,
        });
        return next;
      });
    };

    messenger.on("message", handleMessage);
    
    return () => {
      messenger.off("message", handleMessage);
    };
  }, [messenger, isReady, user, ndk, fetchConversations, mapNDKMessage]);

  return { 
    conversations: conversations ? Array.from(conversations.values()) : [], 
    loading, 
    refresh: fetchConversations 
  };
}
