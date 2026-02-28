import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";

const ALGO_RELAY = "wss://algo.utxo.one";

export async function fetchFromAlgoRelay(
  viewerPubkey: string,
  limit = 50
): Promise<NDKEvent[]> {
  const algoNDK = new NDK({
    explicitRelayUrls: [ALGO_RELAY],
  });

  try {
    await algoNDK.connect(3000);

    const filter: NDKFilter = {
      kinds: [1],
      limit,
      authors: [viewerPubkey], 
    };

    const events = await algoNDK.fetchEvents(filter);
    return Array.from(events);
  } catch (err) {
    console.warn("AlgoRelay not available:", err);
    return [];
  } finally {
    algoNDK.pool.relays.forEach(r => r.disconnect());
  }
}
