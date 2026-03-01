"use client";

import React, { useEffect, useState } from "react";
import { useFollowSuggestions } from "@/hooks/useFollowSuggestions";
import { Avatar } from "@/components/common/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import Link from "next/link";
import { useNDK } from "@/hooks/useNDK";
import { NDKUser } from "@nostr-dev-kit/ndk";
import { UserIdentity } from "@/components/common/UserIdentity";

export const WhoToFollow = () => {
  const { suggestions, loading } = useFollowSuggestions(3);
  const { ndk } = useNDK();
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (suggestions.length > 0 && ndk) {
      const toFetch = suggestions.map(s => s.pubkey);
      const sub = ndk.subscribe(
        { kinds: [0], authors: toFetch },
        { closeOnEose: true }
      );

      sub.on("event", (event) => {
        try {
          const profile = JSON.parse(event.content);
          setProfiles(prev => new Map(prev).set(event.pubkey, profile));
        } catch (e) {}
      });

      return () => sub.stop();
    }
  }, [suggestions, ndk]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20">
      <div className="px-4 mb-3 flex items-center justify-between">
        <h3 className="font-black text-lg text-gray-900 dark:text-white">Who to follow</h3>
      </div>

      <div className="space-y-4 px-4">
        {suggestions.map((suggestion) => {
          const profile = profiles.get(suggestion.pubkey);
          const user = ndk?.getUser({ pubkey: suggestion.pubkey });
          const npub = user?.npub || suggestion.pubkey;

          return (
            <div key={suggestion.pubkey} className="flex items-center justify-between gap-3">
              <Link href={`/${npub}`} className="shrink-0">
                <Avatar 
                  pubkey={suggestion.pubkey} 
                  src={profile?.picture} 
                  size={48} 
                  className="rounded-full"
                />
              </Link>
              
              <div className="flex-1 min-w-0">
                <Link href={`/${npub}`} className="block">
                  <UserIdentity 
                    pubkey={suggestion.pubkey}
                    displayName={profile?.name || profile?.displayName}
                    nip05={profile?.nip05}
                    variant="post"
                  />
                </Link>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                  Followed by {suggestion.followedByCount} people you follow
                </p>
              </div>

              <div className="shrink-0">
                <FollowButton targetPubkey={suggestion.pubkey} size="sm" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 mt-4">
        <Link 
          href="/search" 
          className="text-blue-500 text-sm font-bold hover:underline"
        >
          Show more
        </Link>
      </div>
    </div>
  );
};
