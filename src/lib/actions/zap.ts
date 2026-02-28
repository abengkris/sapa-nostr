import NDK, { NDKEvent, NDKUser, NDKZapper } from "@nostr-dev-kit/ndk";

/**
 * Handle the zap process for a specific event or user.
 * @param ndk The NDK instance
 * @param amount Satoshis to send (in millisatoshis)
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
    const zapper = new NDKZapper(target, amount, "msat", { comment, ndk });

    return new Promise((resolve, reject) => {
      // Listen for the invoice event
      zapper.on("ln_invoice", (invoice: any) => {
        resolve(invoice.pr);
      });
      
      // Handle potential errors
      zapper.on("notice", (msg: string) => {
        console.warn("Zapper notice:", msg);
      });

      // Start the zap process
      zapper.zap().catch((err) => {
        console.error("Zapper.zap error:", err);
        reject(err);
      });
      
      // Safety timeout
      setTimeout(() => reject(new Error("Zap invoice timeout")), 20000);
    });
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
