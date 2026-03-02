"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import NDK, { NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk";
import NDKCacheAdapterDexie from "@nostr-dev-kit/ndk-cache-dexie";
import { NDKMessenger, CacheModuleStorage } from "@nostr-dev-kit/messages";
import { useAuthStore } from "@/store/auth";
import { getNDK } from "@/lib/ndk";

export interface NDKContextType {
  ndk: NDK | null;
  messenger: NDKMessenger | null;
  isReady: boolean;
}

export const NDKContext = createContext<NDKContextType>({
  ndk: null,
  messenger: null,
  isReady: false,
});

export const NDKProvider = ({ children }: { children: ReactNode }) => {
  const [ndk, setNdk] = useState<NDK | null>(null);
  const [messenger, setMessenger] = useState<NDKMessenger | null>(null);
  const [isReady, setIsReady] = useState(false);
  const { privateKey, isLoggedIn, loginType, publicKey, setUser } = useAuthStore();

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    let dexieAdapter: NDKCacheAdapterDexie | null = null;
    try {
      dexieAdapter = new NDKCacheAdapterDexie({ dbName: "ndk-cache" });
    } catch (e) {
      console.error("Failed to initialize Dexie adapter:", e);
    }

    const instance = getNDK();
    
    // Set cache adapter if not already set
    if (!instance.cacheAdapter && dexieAdapter) {
      instance.cacheAdapter = dexieAdapter as any;
    }

    // Performance Optimization
    instance.initialValidationRatio = 1.0;
    instance.lowestValidationRatio = 1.0;

    // Handle session restoration
    const restoreSession = async () => {
      if (isLoggedIn) {
        if (loginType === 'privateKey' && privateKey) {
          instance.signer = new NDKPrivateKeySigner(privateKey);
        } else if (loginType === 'nip07') {
          if (window.nostr) {
            instance.signer = new NDKNip07Signer();
          }
        }

        if (publicKey) {
          const user = instance.getUser({ pubkey: publicKey });
          user.ndk = instance;
          instance.activeUser = user;
          user.fetchProfile().finally(() => {
            setUser(user);
          });
          setUser(user);
        }
      }
    };

    restoreSession();
    setNdk(instance);

    // Initialize Messenger safely with Storage
    let msgInstance: NDKMessenger | null = null;
    try {
      const storage = (dexieAdapter && publicKey) 
        ? new CacheModuleStorage(dexieAdapter as any, publicKey) 
        : undefined;
      
      msgInstance = new NDKMessenger(instance, { storage });
      setMessenger(msgInstance);
    } catch (e) {
      console.error("Failed to initialize NDKMessenger:", e);
    }

    // Connection with safety timeout
    const connectPromise = instance.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 10000)
    );

    Promise.race([connectPromise, timeoutPromise])
      .then(async () => {
        setIsReady(true);
        console.log("NDK connected and session restored");
        
        if (isLoggedIn && msgInstance) {
          try {
            await msgInstance.start();
          } catch (e) {
            console.error("Failed to start NDKMessenger:", e);
          }
        }
      })
      .catch(async (err) => {
        console.warn("NDK connection partial or timed out:", err.message);
        setIsReady(true);
        
        if (isLoggedIn && msgInstance) {
          try {
            await msgInstance.start();
          } catch (e) {
            console.error("Failed to start NDKMessenger (fallback):", e);
          }
        }
      });
  }, [isLoggedIn, loginType, privateKey, publicKey, setUser]);

  return (
    <NDKContext.Provider value={{ ndk, messenger, isReady }}>
      {children}
    </NDKContext.Provider>
  );
};
