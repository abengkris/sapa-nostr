import { describe, it, expect, beforeEach, afterEach } from "vitest";
import NDK from "@nostr-dev-kit/ndk";
import { RelayPoolMock, UserGenerator, EventGenerator, SignerGenerator } from "@nostr-dev-kit/ndk/test";
import { reactToEvent } from "../reactions";

describe("reactToEvent with NDK Test Utils", () => {
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

  it("should publish a like reaction", async () => {
    const alice = await UserGenerator.getUser("alice", ndk as any);
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const targetEvent = await EventGenerator.createEvent(1, "Original post", alice.pubkey);
    await reactToEvent(ndk, targetEvent as any, "+");

    const sentEvents = relay?.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 7);

    expect(sentEvents?.length).toBe(1);
    expect(sentEvents?.[0][1].content).toBe("+");
    expect(sentEvents?.[0][1].tags).toContainEqual(["e", targetEvent.id]);
  });

  it("should publish a dislike reaction", async () => {
    const alice = await UserGenerator.getUser("alice", ndk as any);
    (ndk as any).signer = SignerGenerator.getSigner("alice");
    const relay = pool.getMockRelay("wss://relay.example.com");

    const targetEvent = await EventGenerator.createEvent(1, "Original post", alice.pubkey);
    await reactToEvent(ndk, targetEvent as any, "-");

    const sentEvents = relay?.messageLog
      .filter((m: any) => m.direction === "out")
      .map((m: any) => JSON.parse(m.message))
      .filter((m: any) => m[0] === "EVENT" && m[1].kind === 7);

    expect(sentEvents?.length).toBe(1);
    expect(sentEvents?.[0][1].content).toBe("-");
  });
});
