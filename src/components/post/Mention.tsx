"use client";

import React from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { nip19 } from "nostr-tools";

interface MentionProps {
  uri: string;
}

export const Mention: React.FC<MentionProps> = ({ uri }) => {
  const cleanUri = uri.startsWith("nostr:") ? uri.slice(6) : uri;
  
  let pubkey = "";
  try {
    const decoded = nip19.decode(cleanUri);
    if (decoded.type === "npub") {
      pubkey = decoded.data;
    } else if (decoded.type === "nprofile") {
      pubkey = decoded.data.pubkey;
    }
  } catch (e) {
    // Fallback if decode fails
  }

  const { profile } = useProfile(pubkey || undefined);

  if (!pubkey) {
    return <span className="text-blue-500">{uri}</span>;
  }

  const name = profile?.name || profile?.displayName || `${cleanUri.slice(0, 8)}...${cleanUri.slice(-4)}`;

  return (
    <Link 
      href={`/${pubkey}`} 
      className="text-blue-500 hover:underline font-medium"
      onClick={(e) => e.stopPropagation()}
    >
      @{name}
    </Link>
  );
};
