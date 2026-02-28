import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { follow, unfollow } from "../follow";

describe("follow/unfollow with NDK Test Utils", () => {
  let ndk: NDK;
  let pool: RelayPoolMock;

  beforeEach(async () => {
    pool = new RelayPoolMock();
    ndk = new NDK({ explicitRelayUrls: [] });
    ndk.pool = pool;
    pool.addMockRelay("wss://relay.example.com");
    EventGenerator.setNDK(ndk);
  });

  afterEach(() => {
    pool.disconnectAll();
    pool.resetAll();
  });

  it("should follow a new user and publish a kind:3 event", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    ndk.signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    relay.on("subscription", async ({ id, filters }) => {
      if (filters[0].kinds?.includes(3)) {
        relay.simulateEOSE(id);
      }
    });

    await follow(ndk, "target-pubkey");

    const sentEvents = relay.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 3);

    expect(sentEvents.length).toBeGreaterThan(0);
    expect(sentEvents[0][1].tags).toContainEqual(["p", "target-pubkey"]);
  });

  it("should unfollow an existing user", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    ndk.signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const initialContactList = await EventGenerator.createEvent(3, "", alice.pubkey);
    initialContactList.tags = [["p", "friend1"], ["p", "friend2"]];
    await initialContactList.sign(ndk.signer);
    
    relay.on("subscription", async ({ id, filters }) => {
      if (filters[0].kinds?.includes(3)) {
        await relay.simulateEvent(initialContactList, id);
        relay.simulateEOSE(id);
      }
    });

    await unfollow(ndk, "friend1");

    const sentEvents = relay.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 3);

    expect(sentEvents.length).toBeGreaterThan(0);
    const lastEvent = sentEvents[sentEvents.length - 1][1];
    expect(lastEvent.tags).not.toContainEqual(["p", "friend1"]);
    expect(lastEvent.tags).toContainEqual(["p", "friend2"]);
  });
});
