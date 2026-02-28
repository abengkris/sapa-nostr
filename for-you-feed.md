# 🎯 "For You" Feed — Implementasi Lengkap

## Konteks: Kenapa Ini Lebih Kompleks dari Global Feed

Global feed = query semua kind:1 → tampilkan berdasarkan waktu.
For You = **tidak ada yang tahu post mana yang relevan untuk kamu** karena Nostr desentralisasi.

Solusinya: **3 lapisan yang dikombinasikan**, dari yang paling cepat ke yang paling akurat.

```
Tier 1 — Client-side Scoring    (offline, 0ms, berbasis social graph)
Tier 2 — AlgoRelay              (wss://algo.utxo.one, ~50ms, personalized)
Tier 3 — NIP-90 DVM kind:5300  (request/response, ~2-5s, paling powerful)
```

Strategi render: **Tier 1 muncul duluan**, Tier 2+3 merge dan re-sort saat datang.

---

## Bagian 1 — Scoring Engine (Client-Side)

Tanpa network request apapun. Murni dari data yang sudah ada.

```typescript
// src/lib/feed/scorer.ts

import { NDKEvent } from "@nostr-dev-kit/ndk";

export interface ScoringContext {
  viewerPubkey: string;
  followingSet: Set<string>;        // pubkey yang kamu follow
  followsOfFollowsSet: Set<string>; // pubkey yang difollow oleh followingmu
  interactionHistory: Map<string, number>; // pubkey → berapa kali kamu interaksi
  mutedSet: Set<string>;            // pubkey yang dimute
}

export interface ScoredEvent {
  event: NDKEvent;
  score: number;
  signals: Record<string, number>; // breakdown skor per sinyal (untuk debug)
}

// Bobot tiap sinyal — bisa dijadikan user preference nanti
const WEIGHTS = {
  // Social graph
  isFollowing: 50,        // author langsung kamu follow
  isFollowOfFollow: 20,   // author difollow oleh orang yang kamu follow
  frequentInteraction: 30, // kamu sering interaksi dengan author ini

  // Konten
  hasMedia: 5,            // post dengan gambar/video
  hasLongContent: 3,      // post dengan konten panjang (lebih dari 140 char)
  isReply: -10,           // reply ke orang yang tidak kamu follow → kurangi skor
  isRepost: 5,            // repost dari following → sedikit boost

  // Engagement (dari orang yang kamu follow)
  networkReaction: 15,    // ada orang yang kamu follow yang like ini
  networkReply: 10,       // ada orang yang kamu follow yang reply ini

  // Freshness — post lama turun skornya
  // Dihitung dinamis berdasarkan age
} as const;

/**
 * Hitung skor untuk satu event.
 * Semakin tinggi = semakin relevan untuk user ini.
 */
export function scoreEvent(
  event: NDKEvent,
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent {
  const signals: Record<string, number> = {};
  let score = 0;

  // --- Muted: langsung skor minimum ---
  if (ctx.mutedSet.has(event.pubkey)) {
    return { event, score: -999, signals: { muted: -999 } };
  }

  // --- Social graph signals ---
  if (ctx.followingSet.has(event.pubkey)) {
    signals.isFollowing = WEIGHTS.isFollowing;
    score += WEIGHTS.isFollowing;
  } else if (ctx.followsOfFollowsSet.has(event.pubkey)) {
    signals.isFollowOfFollow = WEIGHTS.isFollowOfFollow;
    score += WEIGHTS.isFollowOfFollow;
  }

  // Interaksi history (semakin sering, semakin tinggi)
  const interactionCount = ctx.interactionHistory.get(event.pubkey) ?? 0;
  if (interactionCount > 0) {
    const interactionBoost = Math.min(interactionCount * 5, WEIGHTS.frequentInteraction);
    signals.frequentInteraction = interactionBoost;
    score += interactionBoost;
  }

  // --- Konten signals ---
  const content = event.content ?? "";

  if (content.length > 140) {
    signals.hasLongContent = WEIGHTS.hasLongContent;
    score += WEIGHTS.hasLongContent;
  }

  const hasMedia = /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|mp4|mov)/i.test(content);
  if (hasMedia) {
    signals.hasMedia = WEIGHTS.hasMedia;
    score += WEIGHTS.hasMedia;
  }

  // Reply ke orang yang tidak difollow = kurangi skor
  const eTags = event.tags.filter(t => t[0] === "e");
  const pTags = event.tags.filter(t => t[0] === "p");
  const isReply = eTags.length > 0;
  if (isReply) {
    const replyTarget = pTags[pTags.length - 1]?.[1];
    if (replyTarget && !ctx.followingSet.has(replyTarget)) {
      signals.isReply = WEIGHTS.isReply;
      score += WEIGHTS.isReply;
    }
  }

  // --- Network engagement signals ---
  if (networkActivity) {
    const activity = networkActivity.get(event.id);
    if (activity) {
      if (activity.reactions.size > 0) {
        const reactionBoost = Math.min(
          activity.reactions.size * WEIGHTS.networkReaction,
          WEIGHTS.networkReaction * 5
        );
        signals.networkReaction = reactionBoost;
        score += reactionBoost;
      }
      if (activity.replies.size > 0) {
        const replyBoost = Math.min(
          activity.replies.size * WEIGHTS.networkReply,
          WEIGHTS.networkReply * 5
        );
        signals.networkReply = replyBoost;
        score += replyBoost;
      }
    }
  }

  // --- Freshness decay ---
  // Post berumur 1 jam = 0 penalty
  // Post berumur 6 jam = -10
  // Post berumur 24 jam = -30
  // Post berumur 72 jam = -60
  const ageHours = (Date.now() / 1000 - (event.created_at ?? 0)) / 3600;
  let freshnessScore = 0;
  if (ageHours < 1) freshnessScore = 0;
  else if (ageHours < 6) freshnessScore = -10;
  else if (ageHours < 24) freshnessScore = -30;
  else if (ageHours < 72) freshnessScore = -60;
  else freshnessScore = -100;

  signals.freshness = freshnessScore;
  score += freshnessScore;

  return { event, score, signals };
}

/**
 * Sort array events berdasarkan skor.
 * Post dengan skor sama → lebih baru di atas.
 */
export function rankEvents(
  events: NDKEvent[],
  ctx: ScoringContext,
  networkActivity?: Map<string, { reactions: Set<string>; replies: Set<string> }>
): ScoredEvent[] {
  return events
    .map(e => scoreEvent(e, ctx, networkActivity))
    .filter(se => se.score > -999) // filter muted
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Tiebreak: lebih baru di atas
      return (b.event.created_at ?? 0) - (a.event.created_at ?? 0);
    });
}
```

---

## Bagian 2 — Hook: `useScoringContext`

Kumpulkan semua data yang dibutuhkan scorer.

```typescript
// src/hooks/useScoringContext.ts
"use client";

import { useEffect, useState, useRef } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";
import { ScoringContext } from "@/lib/feed/scorer";

export function useScoringContext(
  viewerPubkey: string | undefined,
  followingList: string[]
): ScoringContext | null {
  const [ctx, setCtx] = useState<ScoringContext | null>(null);
  const buildingRef = useRef(false);

  useEffect(() => {
    if (!viewerPubkey || !followingList.length || buildingRef.current) return;
    buildingRef.current = true;

    async function build() {
      const ndk = getNDK();

      // 1. Follows-of-follows: fetch contact list semua orang yang difollow
      const followsOfFollows = new Set<string>();
      const contactListEvents = await ndk.fetchEvents({
        kinds: [3],
        authors: followingList.slice(0, 150), // batasi agar tidak terlalu banyak
      });

      for (const ev of contactListEvents) {
        for (const tag of ev.tags) {
          if (tag[0] === "p" && tag[1]) {
            followsOfFollows.add(tag[1]);
          }
        }
      }
      // Hapus diri sendiri dan langsung following
      followsOfFollows.delete(viewerPubkey!);
      for (const pk of followingList) followsOfFollows.delete(pk);

      // 2. Interaksi history: lihat reactions & replies yang pernah viewer kirim
      const interactionHistory = new Map<string, number>();
      const myRecentActivity = await ndk.fetchEvents({
        kinds: [1, 7], // posts (replies) + reactions
        authors: [viewerPubkey!],
        limit: 500,
        since: Math.floor(Date.now() / 1000) - 30 * 24 * 3600, // 30 hari terakhir
      });

      for (const ev of myRecentActivity) {
        for (const tag of ev.tags) {
          if (tag[0] === "p" && tag[1]) {
            interactionHistory.set(
              tag[1],
              (interactionHistory.get(tag[1]) ?? 0) + 1
            );
          }
        }
      }

      // 3. Muted list (NIP-51 kind:10000)
      const mutedSet = new Set<string>();
      const muteListEvent = await ndk.fetchEvent({
        kinds: [10000],
        authors: [viewerPubkey!],
      });
      if (muteListEvent) {
        for (const tag of muteListEvent.tags) {
          if (tag[0] === "p" && tag[1]) mutedSet.add(tag[1]);
        }
      }

      setCtx({
        viewerPubkey: viewerPubkey!,
        followingSet: new Set(followingList),
        followsOfFollowsSet: followsOfFollows,
        interactionHistory,
        mutedSet,
      });
    }

    build().catch(console.error);
  }, [viewerPubkey, followingList.join(",")]);

  return ctx;
}
```

---

## Bagian 3 — AlgoRelay Integration (Tier 2)

AlgoRelay adalah relay Nostr pertama dengan algorithmic feed yang memprioritaskan konten berdasarkan interaction history dan network popularity. Tersedia di `wss://algo.utxo.one`.

```typescript
// src/lib/feed/algoRelay.ts

import NDK, { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";

const ALGO_RELAY = "wss://algo.utxo.one";

/**
 * Fetch personalized feed dari AlgoRelay.
 * AlgoRelay menggunakan pubkey untuk personalisasi — pastikan NDK sudah punya signer.
 */
export async function fetchFromAlgoRelay(
  viewerPubkey: string,
  limit = 50
): Promise<NDKEvent[]> {
  // Buat koneksi NDK terpisah khusus ke AlgoRelay
  const algoNDK = new NDK({
    explicitRelayUrls: [ALGO_RELAY],
  });

  try {
    await algoNDK.connect(3000);

    const filter: NDKFilter = {
      kinds: [1],
      limit,
      // AlgoRelay menggunakan pubkey viewer untuk personalisasi
      // Kirim sebagai authors tag atau via signer context
      authors: [viewerPubkey], // AlgoRelay akan expand ini ke social graph
    };

    const events = await algoNDK.fetchEvents(filter);
    return Array.from(events);
  } catch (err) {
    console.warn("AlgoRelay tidak tersedia:", err);
    return [];
  } finally {
    // Disconnect setelah selesai
    algoNDK.pool.relays.forEach(r => r.disconnect());
  }
}
```

---

## Bagian 4 — NIP-90 DVM Feed (Tier 3, Opsional)

NIP-90 mendefinisikan interaksi antara customer dan service provider untuk on-demand computation. Kind 5300 = request for personalized feed.

```typescript
// src/lib/feed/dvmFeed.ts

import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";

// Pubkey DVM yang menyediakan feed (bisa multiple)
const FEED_DVM_PUBKEYS = [
  // Tambahkan pubkey DVM yang support kind:5300
  // Bisa dicari di data-vending-machines.org
];

/**
 * Request personalized feed dari DVM via NIP-90.
 * Ini async request/response — perlu menunggu DVM merespon.
 */
export async function requestDVMFeed(
  viewerPubkey: string,
  options: {
    limit?: number;
    since?: number;
    dvmPubkey?: string;
  } = {}
): Promise<NDKEvent[]> {
  const ndk = getNDK();
  if (!ndk.signer) throw new Error("Signer diperlukan untuk DVM request");

  // 1. Buat job request event (kind:5300)
  const jobRequest = new NDKEvent(ndk);
  jobRequest.kind = 5300; // NIP-90: personalized feed request
  jobRequest.content = "";
  jobRequest.tags = [
    ["i", viewerPubkey, "text"],   // input: pubkey viewer
    ["param", "limit", String(options.limit ?? 20)],
    ["relays",
      "wss://relay.damus.io",
      "wss://nos.lol",
      "wss://relay.nostr.band"
    ],
    ["output", "application/json"],
  ];

  // Tag ke DVM spesifik jika ada
  if (options.dvmPubkey) {
    jobRequest.tags.push(["p", options.dvmPubkey]);
  }

  await jobRequest.sign();
  await jobRequest.publish();

  // 2. Tunggu response (kind:6300) dengan timeout 5 detik
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      sub.stop();
      resolve([]); // timeout → return empty, fallback ke tier 1
    }, 5000);

    const sub = ndk.subscribe({
      kinds: [6300],
      "#e": [jobRequest.id],
    }, { closeOnEose: false });

    sub.on("event", (resultEvent: NDKEvent) => {
      clearTimeout(timeout);
      sub.stop();

      try {
        // DVM mengembalikan list event IDs atau event JSON di content
        const resultData = JSON.parse(resultEvent.content);

        // Format bisa berupa array event JSON atau array event IDs
        if (Array.isArray(resultData)) {
          if (typeof resultData[0] === "string") {
            // Array of event IDs → fetch eventnya
            ndk.fetchEvents({ ids: resultData }).then(eventsSet => {
              resolve(Array.from(eventsSet));
            });
          } else {
            // Array of event JSON
            const events = resultData.map((raw: object) => new NDKEvent(ndk, raw as any));
            resolve(events);
          }
        } else {
          resolve([]);
        }
      } catch {
        resolve([]);
      }
    });
  });
}
```

---

## Bagian 5 — Hook Utama: `useForYouFeed`

Menggabungkan semua tier dengan paused feed dari dokumen sebelumnya.

```typescript
// src/hooks/useForYouFeed.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { getNDK } from "@/lib/ndk";
import { rankEvents, ScoringContext } from "@/lib/feed/scorer";
import { useScoringContext } from "./useScoringContext";
import { fetchFromAlgoRelay } from "@/lib/feed/algoRelay";

interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  isEnriching: boolean;   // true saat tier 2/3 sedang di-fetch
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);
  const networkActivityRef = useRef(
    new Map<string, { reactions: Set<string>; replies: Set<string> }>()
  );

  // Build scoring context
  const scoringCtx = useScoringContext(viewerPubkey, followingList);

  // ─── Tier 1: Subscribe NDK dengan scoring ────────────────────────
  useEffect(() => {
    if (!followingList.length) {
      setIsLoading(false);
      return;
    }

    const ndk = getNDK();
    setIsLoading(true);
    seenIds.current = new Set();
    isInitialLoadDone.current = false;

    // Fetch follows-of-follows untuk expand pool (tapi filter dengan skor)
    const followsOfFollows = scoringCtx?.followsOfFollowsSet
      ? Array.from(scoringCtx.followsOfFollowsSet).slice(0, 200)
      : [];

    const authors = [...followingList, ...followsOfFollows];

    const sub = ndk.subscribe(
      { kinds: [1], authors, limit: 50 },
      { closeOnEose: false }
    );

    const rawBuffer: NDKEvent[] = [];

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      if (!isInitialLoadDone.current) {
        rawBuffer.push(event);
      } else {
        // Post baru → buffer (paused feed pattern)
        bufferRef.current = [event, ...bufferRef.current];
        setNewCount(bufferRef.current.length);
      }
    });

    sub.on("eose", () => {
      // Rank initial batch dengan scoring engine
      const ranked = scoringCtx
        ? rankEvents(rawBuffer, scoringCtx, networkActivityRef.current)
          .map(se => se.event)
        : rawBuffer.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

      setPosts(ranked);
      setIsLoading(false);

      // Delay sebelum aktifkan buffering
      setTimeout(() => {
        isInitialLoadDone.current = true;
      }, 1500);
    });

    return () => sub.stop();
  }, [followingList.join(","), scoringCtx]);

  // ─── Tier 2: AlgoRelay enrichment ────────────────────────────────
  useEffect(() => {
    if (!viewerPubkey || isLoading) return;

    setIsEnriching(true);
    fetchFromAlgoRelay(viewerPubkey, 30)
      .then(algoEvents => {
        if (!algoEvents.length) return;

        const newEvents = algoEvents.filter(e => !seenIds.current.has(e.id));
        newEvents.forEach(e => seenIds.current.add(e.id));

        if (!newEvents.length) return;

        setPosts(prev => {
          const combined = [...prev, ...newEvents];
          if (scoringCtx) {
            return rankEvents(combined, scoringCtx, networkActivityRef.current)
              .map(se => se.event);
          }
          return combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
        });
      })
      .catch(() => {}) // AlgoRelay gagal = tidak masalah, tier 1 sudah ada
      .finally(() => setIsEnriching(false));
  }, [viewerPubkey, isLoading]);

  // ─── Network activity tracking (untuk scoring) ───────────────────
  useEffect(() => {
    if (!followingList.length) return;
    const ndk = getNDK();

    // Subscribe ke reactions & replies dari following
    const activitySub = ndk.subscribe({
      kinds: [1, 7], // replies + reactions
      authors: followingList,
      since: Math.floor(Date.now() / 1000) - 24 * 3600, // 24 jam terakhir
      limit: 200,
    });

    activitySub.on("event", (ev: NDKEvent) => {
      for (const tag of ev.tags) {
        if (tag[0] !== "e" || !tag[1]) continue;
        const targetId = tag[1];

        if (!networkActivityRef.current.has(targetId)) {
          networkActivityRef.current.set(targetId, {
            reactions: new Set(),
            replies: new Set(),
          });
        }

        const activity = networkActivityRef.current.get(targetId)!;
        if (ev.kind === 7) activity.reactions.add(ev.pubkey);
        if (ev.kind === 1) activity.replies.add(ev.pubkey);
      }
    });

    return () => activitySub.stop();
  }, [followingList.join(",")]);

  // ─── Flush buffer ────────────────────────────────────────────────
  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    const toFlush = scoringCtx
      ? rankEvents(bufferRef.current, scoringCtx, networkActivityRef.current)
        .map(se => se.event)
      : bufferRef.current;

    setPosts(prev => {
      const combined = [...toFlush, ...prev].slice(0, 150); // max 150
      return Array.from(new Map(combined.map(e => [e.id, e])).values());
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [scoringCtx]);

  // ─── Load more ───────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || posts.length === 0) return;
    const ndk = getNDK();
    const oldest = posts[posts.length - 1].created_at;

    const olderEvents = await ndk.fetchEvents({
      kinds: [1],
      authors: followingList,
      until: (oldest ?? 0) - 1,
      limit: 30,
    });

    const newEvents = Array.from(olderEvents).filter(
      e => !seenIds.current.has(e.id)
    );
    newEvents.forEach(e => seenIds.current.add(e.id));

    if (newEvents.length < 30) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...newEvents];
      return scoringCtx
        ? rankEvents(combined, scoringCtx, networkActivityRef.current)
          .map(se => se.event)
        : combined.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
    });
  }, [posts, hasMore, followingList, scoringCtx]);

  return { posts, newCount, isLoading, isEnriching, flushNewPosts, loadMore, hasMore };
}
```

---

## Bagian 6 — Update Home Page: Ganti Tab "Global" → "For You"

```tsx
// src/app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useFollowingList } from "@/hooks/useFollowingList";
import { usePausedFeed } from "@/hooks/usePausedFeed";
import { useForYouFeed } from "@/hooks/useForYouFeed";
import { FeedList } from "@/components/feed/FeedList";
import { NewPostsIsland } from "@/components/feed/NewPostsIsland";
import { PostComposer } from "@/components/post/PostComposer";
import { Sparkles, Users } from "lucide-react";

type FeedTab = "following" | "forYou";

export default function HomePage() {
  const { user, isLoggedIn, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<FeedTab>("forYou");
  const { following } = useFollowingList(user?.pubkey);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace("/auth/login");
  }, [isLoggedIn, authLoading, router]);

  if (authLoading || !isLoggedIn || !user) return <LoadingScreen />;

  return (
    <main className="min-h-screen bg-black max-w-xl mx-auto">
      {/* Sticky header dengan tabs */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="flex">
          <TabButton
            active={tab === "forYou"}
            onClick={() => setTab("forYou")}
            icon={<Sparkles size={15} />}
          >
            Untuk Kamu
          </TabButton>
          <TabButton
            active={tab === "following"}
            onClick={() => setTab("following")}
            icon={<Users size={15} />}
          >
            Mengikuti
          </TabButton>
        </div>
      </header>

      {/* Post composer */}
      <PostComposer />
      <div className="h-px bg-zinc-800" />

      {/* Feed — key berubah saat tab ganti = fresh mount */}
      {tab === "forYou" ? (
        <ForYouFeed
          key="forYou"
          viewerPubkey={user.pubkey}
          followingList={following}
        />
      ) : (
        <FollowingFeed
          key="following"
          followingList={following}
        />
      )}
    </main>
  );
}

// ─── Sub-komponen ───────────────────────────────────────────────────

function ForYouFeed({
  viewerPubkey,
  followingList,
}: {
  viewerPubkey: string;
  followingList: string[];
}) {
  const {
    posts, newCount, isLoading, isEnriching,
    flushNewPosts, loadMore, hasMore
  } = useForYouFeed({ viewerPubkey, followingList });

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={flushNewPosts} />

      {/* Indikator enrichment */}
      {isEnriching && (
        <div className="flex items-center justify-center gap-2 py-2 text-zinc-500 text-xs">
          <div className="w-1 h-1 bg-purple-500 rounded-full animate-pulse" />
          Mempersonalisasi feed...
        </div>
      )}

      <FeedList
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Belum ada konten. Follow lebih banyak orang!"
      />
    </div>
  );
}

function FollowingFeed({ followingList }: { followingList: string[] }) {
  const { posts, newCount, isLoading, flushNewPosts, loadMore, hasMore } =
    usePausedFeed({
      filter: {
        kinds: [1],
        authors: followingList,
        limit: 20,
      },
    });

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={flushNewPosts} />
      <FeedList
        posts={posts}
        isLoading={isLoading}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Belum mengikuti siapapun. Cari di Search!"
      />
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5
        py-4 text-sm font-semibold
        transition-all border-b-2
        ${active
          ? "text-white border-purple-500"
          : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50"
        }
      `}
    >
      {icon}
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

---

## Ringkasan Arsitektur For You

```
User buka For You tab
        │
        ▼
useForYouFeed()
        │
        ├─ Tier 1 (NDK subscribe, 0-500ms)
        │   followers + follows-of-follows → rank dengan scorer
        │   → setPosts() → tampil duluan
        │
        ├─ Tier 2 (AlgoRelay, ~50-500ms)
        │   fetch dari wss://algo.utxo.one
        │   → merge + re-rank → update posts
        │   isEnriching = true → false
        │
        └─ Network activity tracker (background)
            subscribe reactions + replies dari following
            → update networkActivityRef
            → skor naik untuk post yang banyak di-like network

Post baru datang → buffer → island "X post baru" → user klik → flush + re-rank
```

**Sinyal skor (dapat dikustomisasi per user nantinya):**
```
+50  Author langsung kamu follow
+30  Kamu sering interaksi dengan author ini
+20  Author difollow oleh orang yang kamu follow
+15  Ada following yang like post ini
+10  Ada following yang reply post ini
+5   Post punya media (gambar/video)
+3   Post panjang (>140 char)
-10  Reply ke orang yang tidak kamu follow
-10 s/d -100  Freshness decay (makin tua makin turun)
-999  Author dimute
```
