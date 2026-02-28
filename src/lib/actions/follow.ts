import NDK, { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk";

/**
 * Follow a user by adding their pubkey to the kind:3 contact list.
 * @param ndk The NDK instance
 * @param pubkeyToFollow The hex pubkey of the user to follow
 */
export const follow = async (ndk: NDK, pubkeyToFollow: string): Promise<void> => {
  const user = ndk.signer ? await ndk.signer.user() : null;
  if (!user) throw new Error("No signer available");

  // 1. Fetch current contact list (kind:3)
  // We use fetchEvent to get the latest kind:3 from relays
  const contactListEvent = await ndk.fetchEvent({
    kinds: [3],
    authors: [user.pubkey],
  });

  const newEvent = new NDKEvent(ndk);
  newEvent.kind = 3;

  if (contactListEvent) {
    // Check if already following
    const isFollowing = contactListEvent.tags.some(
      (t) => t[0] === "p" && t[1] === pubkeyToFollow
    );
    if (isFollowing) return;

    // Copy existing tags and add new one
    newEvent.tags = [...contactListEvent.tags, ["p", pubkeyToFollow]];
    newEvent.content = contactListEvent.content; // Some clients store relay info in content
  } else {
    // First follow ever
    newEvent.tags = [["p", pubkeyToFollow]];
  }

  // 2. Publish new contact list
  await newEvent.publish();
};

/**
 * Unfollow a user by removing their pubkey from the kind:3 contact list.
 * @param ndk The NDK instance
 * @param pubkeyToUnfollow The hex pubkey of the user to unfollow
 */
export const unfollow = async (ndk: NDK, pubkeyToUnfollow: string): Promise<void> => {
  const user = ndk.signer ? await ndk.signer.user() : null;
  if (!user) throw new Error("No signer available");

  // 1. Fetch current contact list
  const contactListEvent = await ndk.fetchEvent({
    kinds: [3],
    authors: [user.pubkey],
  });

  if (!contactListEvent) return;

  // 2. Filter out the pubkey
  const originalTagsCount = contactListEvent.tags.length;
  const newTags = contactListEvent.tags.filter(
    (t) => !(t[0] === "p" && t[1] === pubkeyToUnfollow)
  );

  // Only publish if something actually changed
  if (newTags.length === originalTagsCount) return;

  const newEvent = new NDKEvent(ndk);
  newEvent.kind = 3;
  newEvent.tags = newTags;
  newEvent.content = contactListEvent.content;

  // 3. Publish updated contact list
  await newEvent.publish();
};
