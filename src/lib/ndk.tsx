"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import NDK, { NDKRelaySet, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { useAuthStore } from "@/store/auth";

const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
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
  const { privateKey, isLoggedIn, loginType } = useAuthStore();

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    const dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    const instance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      cacheAdapter: dexieAdapter,
    });

    // Handle session restoration
    if (isLoggedIn && loginType === 'privateKey' && privateKey) {
      instance.signer = new NDKPrivateKeySigner(privateKey);
    }
    // Note: nip07 session restoration usually needs a fresh user interaction 
    // or checking window.nostr availability, but we'll focus on privateKey first.

    instance.connect().then(() => {
      setNdk(instance);
      setIsReady(true);
      console.log("NDK connected with Dexie cache");
    }).catch(err => {
      console.error("NDK connection failed:", err);
    });
  }, [isLoggedIn, loginType, privateKey]);

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
