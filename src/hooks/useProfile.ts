import { useEffect, useState } from "react";
import { useNDK } from "@/hooks/useNDK";
import { NDKUserProfile } from "@nostr-dev-kit/ndk";

export interface ProfileMetadata {
  name?: string;
  picture?: string;
  about?: string;
  nip05?: string;
  lud16?: string;
  banner?: string;
  displayName?: string;
  website?: string;
  pronouns?: string;
  bot?: boolean | string;
  published_at?: number;
}

export function useProfile(pubkey?: string) {
  const { ndk, isReady } = useNDK();
  const [profile, setProfile] = useState<ProfileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ndk || !isReady || !pubkey) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const fetchMetadata = async () => {
      try {
        const user = ndk.getUser({ pubkey });
        // fetchProfile handles fetching from cache first, then relays
        const userProfile = await user.fetchProfile();
        
        if (isMounted && userProfile) {
          const metadata: ProfileMetadata = { ...userProfile };
          
          // Try to get published_at from kind 0 event tags
          const kind0 = await ndk.fetchEvent({ kinds: [0], authors: [pubkey] });
          if (kind0) {
            const publishedAtTag = kind0.tags.find(t => t[0] === 'published_at');
            if (publishedAtTag && publishedAtTag[1]) {
              metadata.published_at = parseInt(publishedAtTag[1]);
            } else {
              // Fallback to event created_at if published_at tag is missing
              metadata.published_at = kind0.created_at;
            }
          }
          
          setProfile(metadata);
        }
      } catch (error) {
        console.error("Error fetching profile for", pubkey, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [ndk, isReady, pubkey]);

  return { profile, loading };
}
