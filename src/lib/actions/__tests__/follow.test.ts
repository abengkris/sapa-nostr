import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { followUser, unfollowUser } from "../follow";

describe("follow/unfollow with NDK Test Utils", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;

  beforeEach(async () => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: [] });
    (ndk as any).pool = pool;
    pool.addMockRelay("wss://relay.example.com");
    EventGenerator.setNDK(ndk as any);
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should follow a new user and publish a kind:3 event", async () => {
    const alice = await UserGenerator.getUser("alice", ndk as any);
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    relay?.on("subscription", async ({ id, filters }: any) => {
      if (filters[0].kinds?.includes(3)) {
        relay.simulateEOSE(id);
      }
    });

    await followUser(ndk, "target-pubkey");

    const sentEvents = relay?.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 3);

    expect(sentEvents?.length).toBeGreaterThan(0);
    expect(sentEvents?.[0][1].tags).toContainEqual(["p", "target-pubkey"]);
  });

  it("should unfollow an existing user", async () => {
    const alice = await UserGenerator.getUser("alice", ndk as any);
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const initialContactList = await EventGenerator.createEvent(3, "", alice.pubkey);
    initialContactList.tags = [["p", "target-pubkey"]];
    await initialContactList.sign(ndk.signer as any);

    relay?.on("subscription", async ({ id, filters }: any) => {
      if (filters[0].kinds?.includes(3)) {
        await relay.simulateEvent(initialContactList, id);
        relay.simulateEOSE(id);
      }
    });

    await unfollowUser(ndk, "target-pubkey");

    const sentEvents = relay?.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 3);

    expect(sentEvents?.length).toBeGreaterThan(0);
    expect(sentEvents?.[0][1].tags).not.toContainEqual(["p", "target-pubkey"]);
  });
});
