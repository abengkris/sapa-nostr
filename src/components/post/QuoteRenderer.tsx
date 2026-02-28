"use client";

import React, { useState, useEffect } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDK } from "@/lib/ndk";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";
import { Loader2 } from "lucide-react";

interface QuoteRendererProps {
  id: string;
}

export const QuoteRenderer: React.FC<QuoteRendererProps> = ({ id }) => {
  const { ndk, isReady } = useNDK();
  const [event, setEvent] = useState<NDKEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useProfile(event?.pubkey);

  useEffect(() => {
    if (!ndk || !isReady || !id) return;

    ndk.fetchEvent(id).then((e) => {
      if (e) setEvent(e);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [ndk, isReady, id]);

  if (loading) return <div className="p-4 border rounded-2xl border-gray-200 dark:border-gray-800 animate-pulse bg-gray-50/50 dark:bg-gray-900/20 h-24 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" /></div>;
  if (!event) return null;

  const displayName = profile?.name || profile?.displayName || `${event.pubkey.slice(0, 8)}...`;
  const avatar = profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.pubkey}`;

  return (
    <div className="mt-2 border rounded-2xl border-gray-200 dark:border-gray-800 p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors overflow-hidden">
      <div className="flex items-center space-x-2 mb-1.5">
        <Image
          src={avatar}
          alt={displayName}
          width={18}
          height={18}
          className="rounded-full bg-gray-200"
          unoptimized
        />
        <span className="font-bold text-sm truncate">{displayName}</span>
        <span className="text-gray-500 text-xs truncate">@{event.pubkey.slice(0, 8)}</span>
      </div>
      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 break-words">
        {event.content}
      </p>
    </div>
  );
};
