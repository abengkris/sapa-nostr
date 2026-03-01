"use client";

import { useState, useEffect } from "react";
import { useNDK } from "./useNDK";
import { NDKRelay, NDKRelayStatus } from "@nostr-dev-kit/ndk";

export interface RelayStatus {
  url: string;
  status: NDKRelayStatus;
}

export function useRelayStatus() {
  const { ndk, isReady } = useNDK();
  const [relays, setRelays] = useState<RelayStatus[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);

  useEffect(() => {
    if (!ndk || !isReady) return;

    const updateStatus = () => {
      const allRelays = Array.from(ndk.pool.relays.values());
      const statusList = allRelays.map((r) => ({
        url: r.url,
        status: r.status,
      }));
      setRelays(statusList);
      setConnectedCount(allRelays.filter((r) => r.status === NDKRelayStatus.CONNECTED).length);
    };

    // Initial check
    updateStatus();

    // Listen for changes
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, [ndk, isReady]);

  return { relays, connectedCount, totalCount: relays.length };
}
