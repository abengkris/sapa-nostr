import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK, { NDKEvent } from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { reactToEvent } from "../reactions";

describe("reactToEvent with NDK Test Utils", () => {
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

  it("should create a like (kind:7) reaction", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    ndk.signer = SignerGenerator.getSigner("alice");

    const targetEvent = await EventGenerator.createSignedTextNote("Hello", alice.pubkey);
    const relay = pool.getMockRelay("wss://relay.example.com");

    const reaction = await reactToEvent(ndk, targetEvent, "+");

    expect(reaction.kind).toBe(7);
    expect(reaction.content).toBe("+");
    expect(reaction.tags).toContainEqual(["e", targetEvent.id]);
    expect(reaction.tags).toContainEqual(["p", targetEvent.pubkey]);

    // Verify it was sent to the relay
    const sentEvents = relay.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 7);

    expect(sentEvents.length).toBeGreaterThan(0);
    expect(sentEvents[0][1].content).toBe("+");
  });

  it("should create a dislike (kind:7) reaction", async () => {
    const alice = await UserGenerator.getUser("alice", ndk);
    ndk.signer = SignerGenerator.getSigner("alice");
    const targetEvent = await EventGenerator.createSignedTextNote("Hello", alice.pubkey);

    const reaction = await reactToEvent(ndk, targetEvent, "-");
    expect(reaction.content).toBe("-");
  });
});
