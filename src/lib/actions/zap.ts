import NDK, { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";

/**
 * Handle the zap process for a specific event or user.
 * @param ndk The NDK instance
 * @param amount Satoshis to send
 * @param target The event or user to zap
 * @param comment Optional comment
 * @returns The BOLT11 invoice or null if failed
 */
export const createZapInvoice = async (
  ndk: NDK,
  amount: number, // in millisats
  target: NDKEvent | NDKUser,
  comment: string = ""
): Promise<string | null> => {
  try {
    // 1. Check if recipient has lightning address
    const recipient = target instanceof NDKEvent ? ndk.getUser({ pubkey: target.pubkey }) : target;
    await recipient.fetchProfile();

    if (!recipient.profile?.lud16 && !recipient.profile?.lud06) {
      throw new Error("Recipient does not have a lightning address (lud16/lud06)");
    }

    // 2. Use NDK's built-in zap method
    // amount is in millisatoshis (1 sat = 1000 millisats)
    const zapInvoice = await (target instanceof NDKEvent 
      ? target.zap(amount, comment) 
      : recipient.zap(amount, comment));

    return zapInvoice;
  } catch (error) {
    console.error("Zap error:", error);
    return null;
  }
};

/**
 * Hook or function to listen for zap confirmation (kind:9735)
 */
export function listenForZapReceipt(ndk: NDK, eventId: string, onReceipt: (receipt: NDKEvent) => void) {
  const filter = {
    kinds: [9735],
    "#e": [eventId],
  };

  const sub = ndk.subscribe(filter, { closeOnEose: false });
  sub.on("event", (event: NDKEvent) => {
    onReceipt(event);
  });

  return () => sub.stop();
}
