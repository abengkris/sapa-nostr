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
          setProfile(userProfile as ProfileMetadata);
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
