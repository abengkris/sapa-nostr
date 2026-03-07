"use client";

import React, { use, useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useChat } from "@/hooks/useChat";
import { useProfile } from "@/hooks/useProfile";
import { useNDK } from "@/hooks/useNDK";
import { useAuthStore } from "@/store/auth";
import { sendMessage, publishReadReceipt } from "@/lib/actions/messages";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/common/Avatar";
import { FormattedAbout } from "@/components/profile/FormattedAbout";
import { nip19 } from "nostr-tools";

export default function ChatPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = use(params);
  const { messenger, ndk } = useNDK();
  const { user: currentUser } = useAuthStore();
  const { messages, loading, refresh } = useChat(pubkey);
  const { profile } = useProfile(pubkey);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hexPubkey = pubkey.startsWith("npub") ? nip19.decode(pubkey).data as string : pubkey;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark as read when entering the chat or receiving messages
  useEffect(() => {
    if (messenger && ndk && hexPubkey) {
      const recipientUser = ndk.getUser({ pubkey: hexPubkey });
      messenger.getConversation(recipientUser).then(conv => {
        if (conv) {
          conv.markAsRead();
          
          // Also publish a read receipt for the last message if it's from the partner
          if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.sender === hexPubkey) {
              publishReadReceipt(lastMsg.event, recipientUser);
            }
          }
        }
      });
    }
  }, [messenger, ndk, hexPubkey, messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !messenger || !ndk || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const recipient = ndk.getUser({ pubkey: hexPubkey });
      const success = await sendMessage(messenger, recipient, content);
      if (success) {
        setContent("");
        refresh();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] lg:h-screen">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <Link href="/messages" className="mr-4 lg:hidden">
            <ArrowLeft size={24} />
          </Link>
          <Link href={`/${pubkey}`} className="flex items-center flex-1 min-w-0">
            <Avatar pubkey={hexPubkey} src={profile?.picture} size={40} className="mr-3" />
            <div className="min-w-0">
              <h2 className="font-bold truncate">
                {profile?.displayName || profile?.name || "Unknown"}
              </h2>
              {profile?.nip05 && (
                <p className="text-xs text-gray-500 truncate">{profile.nip05}</p>
              )}
            </div>
          </Link>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => {
            const isMe = msg.sender === currentUser?.pubkey;
            const prevMsg = messages[i - 1];
            const showTime = !prevMsg || msg.timestamp - prevMsg.timestamp > 300; // 5 mins

            return (
              <div key={msg.id} className="flex flex-col">
                {showTime && (
                  <div className="text-center my-4">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                      {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? "bg-blue-500 text-white rounded-tr-none" 
                        : "bg-gray-100 dark:bg-gray-800 rounded-tl-none"
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      <FormattedAbout text={msg.content} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-black">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start a new message"
              className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="p-2 bg-blue-500 text-white rounded-full disabled:opacity-50 flex-shrink-0"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} fill="currentColor" />}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
