"use client";

import { useMemo, useCallback } from "react";
import NDKBlossom from "@nostr-dev-kit/ndk-blossom";
import { useNDK } from "./useNDK";
import { defaultSHA256Calculator } from "@nostr-dev-kit/ndk-blossom";

const DEFAULT_BLOSSOM_SERVERS = [
  "https://blossom.primal.net",
  "https://cdn.nostr.build",
  "https://nos.lol",
];

export function useBlossom() {
  const { ndk } = useNDK();

  const blossom = useMemo(() => {
    if (!ndk) return null;
    const instance = new NDKBlossom(ndk as any);
    instance.setSHA256Calculator(defaultSHA256Calculator);
    return instance;
  }, [ndk]);

  const uploadFile = useCallback(
    async (file: File, onProgress?: (progress: { loaded: number; total: number }) => void) => {
      if (!blossom) throw new Error("Blossom not initialized");

      // We'll try to use the user's blossom list if available, or fall back to defaults
      const result = await blossom.upload(file, {
        onProgress: (progress) => {
          onProgress?.(progress);
          return "continue";
        },
        fallbackServer: DEFAULT_BLOSSOM_SERVERS[0],
      });

      return result;
    },
    [blossom]
  );

  return { blossom, uploadFile };
}
