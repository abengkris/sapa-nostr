import NDK from "@nostr-dev-kit/ndk";

const DEFAULT_RELAYS = [
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
  "wss://relay.snort.social",
  "wss://purple.relayer.org",
];

let ndkInstance: NDK | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      enableOutboxModel: true,
    });
  }
  return ndkInstance;
}

export async function connectNDK(timeout = 10000): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(timeout);
  return ndk;
}
