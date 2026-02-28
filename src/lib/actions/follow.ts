// src/lib/actions/follow.ts

import { NDKEvent } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";

/**
 * ATURAN WAJIB:
 * Selalu fetch kind:3 terbaru SEBELUM publish yang baru.
 * Jangan pernah publish kind:3 berdasarkan state lokal saja.
 * Satu kind:3 yang salah bisa menghapus seluruh following list.
 */

export type FollowResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Follow seorang user.
 * Fetch kind:3 terkini → tambah pubkey → publish.
 */
export async function followUser(
  targetPubkey: string
): Promise<FollowResult> {
  const ndk = getNDK();
  if (!ndk.signer) return { success: false, error: "Belum login" };

  const me = await ndk.signer.user();

  try {
    // Step 1: Fetch contact list terkini dari relay
    // JANGAN pakai cache saja — harus dari relay untuk hindari race condition
    const currentContactList = await ndk.fetchEvent(
      { kinds: [3], authors: [me.pubkey] },
      { groupable: false, cacheUsage: 0 } // force relay
    );

    // Step 2: Kumpulkan p-tags yang sudah ada
    const existingTags: string[][] = currentContactList?.tags ?? [];

    // Cek apakah sudah follow
    const alreadyFollowing = existingTags.some(
      (t) => t[0] === "p" && t[1] === targetPubkey
    );
    if (alreadyFollowing) return { success: true }; // no-op

    // Step 3: Tambah p-tag baru
    const newTags = [...existingTags, ["p", targetPubkey]];

    // Step 4: Publish kind:3 baru dengan full list
    const newContactList = new NDKEvent(ndk);
    newContactList.kind = 3;
    newContactList.tags = newTags;
    newContactList.content = currentContactList?.content ?? "";

    await newContactList.sign();
    await newContactList.publish();

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal follow",
    };
  }
}

/**
 * Unfollow seorang user.
 * Fetch kind:3 terkini → hapus pubkey → publish.
 */
export async function unfollowUser(
  targetPubkey: string
): Promise<FollowResult> {
  const ndk = getNDK();
  if (!ndk.signer) return { success: false, error: "Belum login" };

  const me = await ndk.signer.user();

  try {
    // Step 1: Fetch contact list terkini
    const currentContactList = await ndk.fetchEvent(
      { kinds: [3], authors: [me.pubkey] },
      { groupable: false, cacheUsage: 0 }
    );

    if (!currentContactList) return { success: true }; // tidak ada → sudah "unfollow"

    // Step 2: Hapus p-tag yang sesuai
    const newTags = currentContactList.tags.filter(
      (t) => !(t[0] === "p" && t[1] === targetPubkey)
    );

    // Step 3: Publish
    const newContactList = new NDKEvent(ndk);
    newContactList.kind = 3;
    newContactList.tags = newTags;
    newContactList.content = currentContactList.content;

    await newContactList.sign();
    await newContactList.publish();

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal unfollow",
    };
  }
}
