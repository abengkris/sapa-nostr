"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import NDK, { NDKRelaySet, NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { useAuthStore } from "@/store/auth";

const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
];

interface NDKContextType {
  ndk: NDK | null;
  isReady: boolean;
}

const NDKContext = createContext<NDKContextType>({
  ndk: null,
  isReady: false,
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { privateKey, isLoggedIn, loginType, publicKey, setUser } = useAuthStore();

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    const instance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      cacheAdapter: dexieAdapter as any,
      enableOutboxModel: true,
    });

    // Performance Optimization: Signature Verification Sampling
    // Only verify 50% of signatures initially, tapering down to 5% for trusted relays
    instance.initialValidationRatio = 0.5;
    instance.lowestValidationRatio = 0.05;

    // Monitor for invalid signatures
    instance.on("event:invalid-sig", (event) => {
      console.error("Invalid signature received from relay:", event.relay?.url, event.id);
    });

    // Handle session restoration
    const restoreSession = async () => {
      if (isLoggedIn) {
        if (loginType === 'privateKey' && privateKey) {
          instance.signer = new NDKPrivateKeySigner(privateKey);
        } else if (loginType === 'nip07') {
          // Check if window.nostr is available
          if (window.nostr) {
            instance.signer = new NDKNip07Signer();
          }
        }

        // Re-populate the user object in the store
        if (publicKey) {
          const user = instance.getUser({ pubkey: publicKey });
          user.ndk = instance;
          // Trigger profile fetch in background
          user.fetchProfile().finally(() => {
            setUser(user);
          });
          setUser(user);
        }
      }
    };

    restoreSession();

    instance.connect().then(() => {
      setNdk(instance);
      setIsReady(true);
      console.log("NDK connected and session restored");
    }).catch(err => {
      console.error("NDK connection failed:", err);
    });
  }, [isLoggedIn, loginType, privateKey, publicKey, setUser]);

  return (
    <NDKContext.Provider value={{ ndk, isReady }}>
      {children}
    </NDKContext.Provider>
  );
};

export const useNDK = () => {
  const context = useContext(NDKContext);
  if (context === undefined) {
    throw new Error("useNDK must be used within an NDKProvider");
  }
  return context;
};
