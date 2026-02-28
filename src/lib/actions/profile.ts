import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { ProfileMetadata } from "@/hooks/useProfile";

/**
 * Update user profile metadata (kind 0).
 */
export async function updateProfile(
  ndk: NDK,
  metadata: ProfileMetadata
): Promise<boolean> {
  if (!ndk.signer) {
    throw new Error("No signer available");
  }

  try {
    const user = await ndk.signer.user();
    const event = new NDKEvent(ndk);
    event.kind = 0;
    event.content = JSON.stringify(metadata);
    
    // We should probably sign and publish
    await event.publish();
    
    // Update local user object if possible or just rely on relay refresh
    return true;
  } catch (error) {
    console.error("Failed to update profile:", error);
    return false;
  }
}
