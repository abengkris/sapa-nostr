"use client";

import { useState, useEffect, useRef } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { useNDK } from "@/hooks/useNDK";

type WoTStatus = "idle" | "loading" | "ready" | "error";

interface UseWoTReturn {
  wot: NDKWoT | null;
  status: WoTStatus;
  pubkeyCount: number;
}

let wotSingleton: NDKWoT | null = null;
let wotLoadPromise: Promise<void> | null = null;

export function useWoT(viewerPubkey: string | undefined): UseWoTReturn {
  const { ndk, isReady } = useNDK();
  const [status, setStatus] = useState<WoTStatus>(
    wotSingleton ? "ready" : "idle"
  );
  const [pubkeyCount, setPubkeyCount] = useState(
    wotSingleton ? wotSingleton.followDistance.size : 0
  );
  const [wot, setWot] = useState<NDKWoT | null>(wotSingleton);

  useEffect(() => {
    if (!ndk || !isReady || !viewerPubkey) return;
    
    if (wotSingleton) {
      setWot(wotSingleton);
      setStatus("ready");
      setPubkeyCount(wotSingleton.followDistance.size);
      return;
    }

    if (wotLoadPromise) {
      setStatus("loading");
      wotLoadPromise.then(() => {
        setWot(wotSingleton);
        setStatus("ready");
        setPubkeyCount(wotSingleton?.followDistance.size ?? 0);
      });
      return;
    }

    setStatus("loading");
    const instance = new NDKWoT(ndk);

    wotLoadPromise = instance
      .load({
        pubkey: viewerPubkey,
        maxDepth: 2,           
      })
      .then(() => {
        instance.enableAutoFilter({
          maxDepth: 2,
          minScore: 0.1,       
          includeUnknown: false, 
        });

        wotSingleton = instance;
        setWot(instance);
        setStatus("ready");
        setPubkeyCount(instance.followDistance.size);
        console.log(`[WoT] Loaded ${instance.followDistance.size} pubkeys in trust graph`);
      })
      .catch(err => {
        console.error("[WoT] Load failed:", err);
        setStatus("error");
        wotLoadPromise = null; 
      });
  }, [ndk, isReady, viewerPubkey]);

  return { wot, status, pubkeyCount };
}

export function resetWoT() {
  wotSingleton = null;
  wotLoadPromise = null;
}
