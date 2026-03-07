import NDK, { NDKEvent, NostrEvent } from "@nostr-dev-kit/ndk";
import { NDKMessage } from "@nostr-dev-kit/messages";

export interface MappedMessage {
  id: string;
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  event: NDKEvent;
  isRead: boolean;
}

/**
 * Standard mapper to convert NDKMessage to our internal MappedMessage type.
 * Handles missing event instances and robust sender/recipient detection.
 */
export function mapNDKMessage(ndkMessage: NDKMessage, ndk?: NDK | null): MappedMessage {
  // NDKMessage might have .event (NDKEvent) or just be a plain object with rumor data
  let event = (ndkMessage as unknown as { event?: NDKEvent }).event;
  
  // If no event instance, create one from rumor or the message itself
  if (!event || !(event instanceof NDKEvent)) {
    const rumor = (ndkMessage.rumor as NostrEvent) || (ndkMessage as unknown as NostrEvent);
    event = new NDKEvent(ndk || undefined);
    event.id = ndkMessage.id || rumor.id || "";
    event.pubkey = ndkMessage.sender?.pubkey || rumor.pubkey || "";
    event.content = ndkMessage.content || rumor.content || "";
    event.created_at = ndkMessage.timestamp || rumor.created_at || 0;
    event.kind = rumor.kind || 14;
    event.tags = rumor.tags || [];
  }

  const sender = ndkMessage.sender?.pubkey || event.pubkey || "";
  const recipient = ndkMessage.recipient?.pubkey || (event.getMatchingTags ? event.getMatchingTags("p")[0]?.[1] : "");
  
  return {
    id: ndkMessage.id || event.id,
    sender: sender,
    recipient: recipient,
    content: ndkMessage.content || event.content,
    timestamp: ndkMessage.timestamp || event.created_at || 0,
    event: event,
    isRead: ndkMessage.read ?? true
  };
}
