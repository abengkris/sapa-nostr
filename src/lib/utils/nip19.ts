import { nip19 } from "nostr-tools";

/**
 * Decodes a NIP-19 string (npub, nprofile, note, nevent, naddr) to its hex ID or pubkey.
 * Returns the original string if it's already hex or decoding fails.
 */
export function decodeToHex(nip19String: string): string {
  if (!nip19String) return "";
  
  // If it's already a 64-char hex string, return it
  if (/^[0-9a-fA-F]{64}$/.test(nip19String)) {
    return nip19String;
  }

  try {
    const decoded = nip19.decode(nip19String);
    
    switch (decoded.type) {
      case "npub":
      case "note":
        return decoded.data;
      case "nprofile":
        return decoded.data.pubkey;
      case "nevent":
        return decoded.data.id;
      case "naddr":
        // For naddr, we usually want the identifier or the pubkey? 
        // In many cases we want the pubkey, but let's return the identifier for now if needed.
        return decoded.data.identifier;
      default:
        return nip19String;
    }
  } catch (e) {
    return nip19String;
  }
}

/**
 * Encodes a hex pubkey to npub.
 */
export function toNpub(pubkey: string): string {
  try {
    if (!pubkey || pubkey.startsWith("npub")) return pubkey;
    return nip19.npubEncode(pubkey);
  } catch (e) {
    return pubkey;
  }
}

/**
 * Encodes a hex event ID to note.
 */
export function toNote(eventId: string): string {
  try {
    if (!eventId || eventId.startsWith("note")) return eventId;
    return nip19.noteEncode(eventId);
  } catch (e) {
    return eventId;
  }
}
