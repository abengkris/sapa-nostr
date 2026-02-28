import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { publishPost } from "../post";

describe("publishPost with NDK Test Utils", () => {
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

  it("should publish a post and verify it on the mock relay", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    ndk.signer = SignerGenerator.getSigner("alice");

    const content = "Hello from NDK Test Utils!";
    const event = await publishPost(ndk, content);

    expect(event.content).toBe(content);
    
    // Verify it was sent to the relay by checking messageLog
    const relay = pool.getMockRelay("wss://relay.example.com");
    const sentEvents = relay.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT");

    expect(sentEvents.length).toBeGreaterThan(0);
    expect(sentEvents[0][1].content).toBe(content);
  });

  it("should correctly handle NIP-10 tags in a reply", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    const rootEvent = await EventGenerator.createSignedTextNote("Root post", alice.pubkey);

    const content = "This is a reply";
    const event = await publishPost(ndk, content, { replyTo: rootEvent });

    // NIP-10 markers: root and reply
    expect(event.tags).toContainEqual(["e", rootEvent.id, "", "root"]);
    expect(event.tags).toContainEqual(["e", rootEvent.id, "", "reply"]);
  });
});
