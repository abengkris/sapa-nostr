import NDK, { NDKEvent, NDKTag } from "@nostr-dev-kit/ndk";
import { nip19 } from "nostr-tools";

interface PostOptions {
  replyTo?: NDKEvent;
  tags?: NDKTag[];
}

export const publishPost = async (
  ndk: NDK,
  content: string,
  options?: PostOptions
): Promise<NDKEvent> => {
  const event = new NDKEvent(ndk);
  event.kind = 1;
  event.content = content;

  if (options?.tags) {
    event.tags = [...options.tags];
  }

  // 1. Handle Hashtags (#nostr) -> t tags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1]);
  hashtags.forEach((tag) => {
    event.tags.push(["t", tag.toLowerCase()]);
  });

  // 2. Handle Mentions (@npub...) -> p tags
  const npubRegex = /@(npub1[0-9a-z]+)/g;
  const mentions = [...content.matchAll(npubRegex)];
  for (const match of mentions) {
    try {
      const npub = match[1];
      const { data: pubkey } = nip19.decode(npub);
      if (typeof pubkey === "string") {
        event.tags.push(["p", pubkey, "", "mention"]);
      }
    } catch (e) {
      console.warn("Invalid npub in mention:", match[1]);
    }
  }

  // 3. Handle Reply (NIP-10) -> e tags
  if (options?.replyTo) {
    const rootTag = options.replyTo.tags.find((t) => t[0] === "e" && t[3] === "root");
    const rootId = rootTag ? rootTag[1] : options.replyTo.id;

    // Add root tag if this is not the root itself
    if (rootId !== options.replyTo.id) {
      event.tags.push(["e", rootId, "", "root"]);
    } else {
      event.tags.push(["e", rootId, "", "root"]);
    }

    // Add reply tag (the direct parent)
    event.tags.push(["e", options.replyTo.id, "", "reply"]);
    
    // Also add p tag for the person we are replying to
    event.tags.push(["p", options.replyTo.pubkey]);
  }

  // 4. Publish
  await event.publish();
  return event;
};
