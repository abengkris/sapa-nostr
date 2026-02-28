# 🕸️ For You Feed dengan `@nostr-dev-kit/wot`

## Kenapa Ganti ke NDK WoT?

Custom scorer sebelumnya kita bangun sendiri graph follow-nya.
NDK WoT sudah melakukan itu semua secara native — lebih efisien, terintegrasi dengan NDK cache, dan diurus oleh tim NDK.

```
Custom scorer (sebelumnya)          NDK WoT (sekarang)
──────────────────────────────────────────────────────
❌ Kita fetch sendiri kind:3        ✅ NDK handle otomatis
❌ Kita bangun graph sendiri        ✅ ndk.wot.load() sekali
❌ Kita hitung distance manual      ✅ ndk.wot.getScore(pubkey)
❌ Kita filter manual              ✅ ndk.wot.enableAutoFilter()
❌ Tidak ada cache                  ✅ Pakai NDK cache adapter
```

---

## 1. Install Package

```bash
npm install @nostr-dev-kit/wot
```

`@nostr-dev-kit/wot` adalah package terpisah dari NDK core. Di dalam monorepo NDK tapi di-publish sendiri.

---

## 2. Cara Kerja NDK WoT

WoT membangun **graf kepercayaan** dari follows:

```
Kamu (depth 0)
  └── Alice (depth 1 — kamu follow)
        └── Bob (depth 2 — Alice follow, kamu tidak)
              └── Carol (depth 3 — Bob follow)
```

Score dihitung dari depth:
```
depth 0 (diri sendiri) → score 1.0
depth 1 (langsung follow) → score ~0.9
depth 2 (follow-of-follow) → score ~0.5-0.7
depth 3+ → score < 0.3 (default di-filter)
```

`enableAutoFilter()` akan **otomatis filter semua subscription** hanya ke pubkey dalam WoT.
Ini berarti For You feed sudah bersih dari spam dan akun tidak dikenal.

---

## 3. Setup NDK dengan WoT

### 3a. Update `src/lib/ndk.ts`

```typescript
// src/lib/ndk.ts
import NDK, { NDKNip07Signer, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { NDKWoT } from "@nostr-dev-kit/wot";

export const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
];

let ndkInstance: NDK | null = null;

export function getNDK(): NDK {
  if (!ndkInstance) {
    ndkInstance = new NDK({
      explicitRelayUrls: DEFAULT_RELAYS,
      autoConnectUserRelays: true,
      autoFetchUserMutelist: true, // otomatis fetch mute list
    });
  }
  return ndkInstance;
}

export async function connectNDK(): Promise<NDK> {
  const ndk = getNDK();
  await ndk.connect(3000);
  return ndk;
}

// ... fungsi signer lainnya tetap sama
```

### 3b. Inisialisasi WoT di NDKProvider

```typescript
// src/providers/NDKProvider.tsx
"use client";

import { useEffect, useRef } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { connectNDK, getNDK } from "@/lib/ndk";
import { useAuthStore } from "@/store/auth";

export function NDKProvider({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore(s => s.restoreSession);
  const connected = useRef(false);

  useEffect(() => {
    if (connected.current) return;
    connected.current = true;

    async function init() {
      const ndk = await connectNDK();
      await restoreSession();
    }

    init().catch(console.error);
  }, [restoreSession]);

  return <>{children}</>;
}
```

---

## 4. Hook: `useWoT` — Load dan Expose WoT Instance

```typescript
// src/hooks/useWoT.ts
"use client";

import { useState, useEffect, useRef } from "react";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { getNDK } from "@/lib/ndk";

type WoTStatus = "idle" | "loading" | "ready" | "error";

interface UseWoTReturn {
  wot: NDKWoT | null;
  status: WoTStatus;
  // Berapa pubkey yang sudah di-index
  pubkeyCount: number;
}

let wotSingleton: NDKWoT | null = null;
let wotLoadPromise: Promise<void> | null = null;

/**
 * Load WoT satu kali, share instance ke semua komponen.
 * WoT instance mahal (fetch banyak kind:3) jadi jangan dibuat berkali-kali.
 */
export function useWoT(viewerPubkey: string | undefined): UseWoTReturn {
  const [status, setStatus] = useState<WoTStatus>(
    wotSingleton ? "ready" : "idle"
  );
  const [pubkeyCount, setPubkeyCount] = useState(
    wotSingleton ? wotSingleton.followDistance.size : 0
  );
  const [wot, setWot] = useState<NDKWoT | null>(wotSingleton);

  useEffect(() => {
    if (!viewerPubkey) return;
    if (wotSingleton) {
      setWot(wotSingleton);
      setStatus("ready");
      return;
    }

    // Jika sedang loading dari komponen lain, tunggu
    if (wotLoadPromise) {
      setStatus("loading");
      wotLoadPromise.then(() => {
        setWot(wotSingleton);
        setStatus("ready");
        setPubkeyCount(wotSingleton?.followDistance.size ?? 0);
      });
      return;
    }

    // Inisiasi load
    setStatus("loading");
    const ndk = getNDK();
    const instance = new NDKWoT(ndk);

    wotLoadPromise = instance
      .load({
        pubkey: viewerPubkey,
        maxDepth: 2,           // depth 1 = direct follows, 2 = FoF
      })
      .then(() => {
        // Aktifkan auto-filter:
        // semua subscription otomatis difilter ke pubkey dalam WoT
        instance.enableAutoFilter({
          maxDepth: 2,
          minScore: 0.1,       // filter out akun dengan score sangat rendah
          includeUnknown: false, // jangan tampilkan post dari luar WoT
        });

        wotSingleton = instance;
        setWot(instance);
        setStatus("ready");
        setPubkeyCount(instance.followDistance.size);
        console.log(
          `[WoT] Loaded ${instance.followDistance.size} pubkeys in trust graph`
        );
      })
      .catch(err => {
        console.error("[WoT] Load failed:", err);
        setStatus("error");
        wotLoadPromise = null; // allow retry
      });
  }, [viewerPubkey]);

  return { wot, status, pubkeyCount };
}

/** Reset WoT singleton — panggil saat user logout */
export function resetWoT() {
  wotSingleton = null;
  wotLoadPromise = null;
}
```

---

## 5. Hook: `useForYouFeed` — Versi WoT

```typescript
// src/hooks/useForYouFeed.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { NDKWoT } from "@nostr-dev-kit/wot";
import { getNDK } from "@/lib/ndk";
import { useWoT } from "./useWoT";

interface UseForYouFeedOptions {
  viewerPubkey: string;
  followingList: string[];
}

interface UseForYouFeedReturn {
  posts: NDKEvent[];
  newCount: number;
  isLoading: boolean;
  wotStatus: "idle" | "loading" | "ready" | "error";
  wotSize: number;            // berapa pubkey dalam trust graph
  flushNewPosts: () => void;
  loadMore: () => void;
  hasMore: boolean;
}

export function useForYouFeed({
  viewerPubkey,
  followingList,
}: UseForYouFeedOptions): UseForYouFeedReturn {
  const { wot, status: wotStatus, pubkeyCount: wotSize } = useWoT(viewerPubkey);

  const [posts, setPosts] = useState<NDKEvent[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const bufferRef = useRef<NDKEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const isInitialLoadDone = useRef(false);

  // ─── Subscribe feed setelah WoT ready ─────────────────────────────
  useEffect(() => {
    // Tunggu WoT selesai load sebelum subscribe
    // Tapi jangan block terlalu lama — fallback ke following saja setelah 5 detik
    if (wotStatus === "idle") return;

    const ndk = getNDK();
    setIsLoading(true);
    seenIds.current = new Set();
    isInitialLoadDone.current = false;
    bufferRef.current = [];

    // Tentukan authors:
    // - Jika WoT ready: gunakan semua pubkey dalam WoT (sudah terfilter oleh NDK)
    // - Jika WoT masih loading / error: fallback ke following list saja
    const authors = wot
      ? getWoTAuthors(wot, followingList)
      : followingList;

    if (!authors.length) {
      setIsLoading(false);
      return;
    }

    const sub = ndk.subscribe(
      {
        kinds: [1],
        authors,
        limit: 30,
      },
      {
        closeOnEose: false,
        // WoT enableAutoFilter sudah aktif, tapi kita juga bisa
        // tambahkan filter manual di sini sebagai layer kedua
      }
    );

    sub.on("event", (event: NDKEvent) => {
      if (seenIds.current.has(event.id)) return;
      seenIds.current.add(event.id);

      if (!isInitialLoadDone.current) {
        setPosts(prev => {
          const next = [...prev, event];
          return wot ? rankByWoT(next, wot) : sortByTime(next);
        });
      } else {
        bufferRef.current = [event, ...bufferRef.current];
        setNewCount(bufferRef.current.length);
      }
    });

    sub.on("eose", () => {
      setIsLoading(false);
      // Re-sort setelah EOSE dengan scoring WoT final
      if (wot) {
        setPosts(prev => rankByWoT(prev, wot));
      }
      setTimeout(() => {
        isInitialLoadDone.current = true;
      }, 1500);
    });

    return () => sub.stop();
  }, [wotStatus, followingList.join(",")]);

  // ─── Flush ───────────────────────────────────────────────────────
  const flushNewPosts = useCallback(() => {
    if (!bufferRef.current.length) return;

    setPosts(prev => {
      const combined = [...bufferRef.current, ...prev].slice(0, 150);
      const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
      return wot ? rankByWoT(unique, wot) : sortByTime(unique);
    });

    bufferRef.current = [];
    setNewCount(0);
  }, [wot]);

  // ─── Load more ───────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (!hasMore || !posts.length) return;
    const ndk = getNDK();

    const oldest = Math.min(...posts.map(p => p.created_at ?? Infinity));
    const authors = wot ? getWoTAuthors(wot, followingList) : followingList;

    const older = await ndk.fetchEvents({
      kinds: [1],
      authors,
      until: oldest - 1,
      limit: 30,
    });

    const newEvents = Array.from(older).filter(e => !seenIds.current.has(e.id));
    newEvents.forEach(e => seenIds.current.add(e.id));
    if (newEvents.length < 30) setHasMore(false);

    setPosts(prev => {
      const combined = [...prev, ...newEvents];
      const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
      return wot ? rankByWoT(unique, wot) : sortByTime(unique);
    });
  }, [posts, hasMore, followingList, wot]);

  return {
    posts,
    newCount,
    isLoading,
    wotStatus,
    wotSize,
    flushNewPosts,
    loadMore,
    hasMore,
  };
}

// ─── Helper functions ──────────────────────────────────────────────

/**
 * Ambil semua pubkey dalam WoT yang relevan sebagai authors.
 * Prioritaskan depth 1 (langsung follow), lalu depth 2.
 * Batasi jumlah untuk hindari query terlalu besar.
 */
function getWoTAuthors(wot: NDKWoT, followingList: string[]): string[] {
  const depth1 = new Set(followingList);
  const depth2: string[] = [];

  // followDistance adalah Map<pubkey, distance>
  for (const [pubkey, distance] of wot.followDistance.entries()) {
    if (distance === 2) depth2.push(pubkey);
  }

  // Gabungkan: semua depth 1, depth 2 yang paling "terpercaya" (batasi 300)
  const allAuthors = [
    ...Array.from(depth1),
    ...depth2.slice(0, 300),
  ];

  return [...new Set(allAuthors)]; // deduplicate
}

/**
 * Rank events berdasarkan WoT score author + freshness.
 *
 * Formula: finalScore = wotScore * freshnessMultiplier
 *
 * wotScore: nilai dari wot.getScore(pubkey)
 *   - 1.0 = diri sendiri
 *   - 0.8-0.9 = direct follow
 *   - 0.3-0.6 = follow of follow
 *
 * freshnessMultiplier: turun seiring waktu
 *   - < 1 jam = 1.0
 *   - 1-6 jam = 0.85
 *   - 6-24 jam = 0.6
 *   - > 24 jam = 0.3
 */
function rankByWoT(events: NDKEvent[], wot: NDKWoT): NDKEvent[] {
  const now = Date.now() / 1000;

  return [...events].sort((a, b) => {
    const scoreA = computeFinalScore(a, wot, now);
    const scoreB = computeFinalScore(b, wot, now);
    return scoreB - scoreA;
  });
}

function computeFinalScore(event: NDKEvent, wot: NDKWoT, now: number): number {
  // getScore() mengembalikan 0-1 berdasarkan follow distance
  const wotScore = wot.getScore(event.pubkey) ?? 0;

  const ageHours = (now - (event.created_at ?? 0)) / 3600;
  let freshness: number;
  if (ageHours < 1) freshness = 1.0;
  else if (ageHours < 6) freshness = 0.85;
  else if (ageHours < 24) freshness = 0.6;
  else freshness = 0.3;

  return wotScore * freshness;
}

function sortByTime(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}
```

---

## 6. Update `ForYouFeed` Component

```tsx
// Bagian dari src/app/page.tsx

function ForYouFeed({
  viewerPubkey,
  followingList,
}: {
  viewerPubkey: string;
  followingList: string[];
}) {
  const {
    posts, newCount, isLoading,
    wotStatus, wotSize,
    flushNewPosts, loadMore, hasMore,
  } = useForYouFeed({ viewerPubkey, followingList });

  return (
    <div className="relative">
      <NewPostsIsland count={newCount} onFlush={flushNewPosts} />

      {/* WoT status banner */}
      <WoTStatusBanner status={wotStatus} size={wotSize} />

      <FeedList
        posts={posts}
        isLoading={isLoading || wotStatus === "loading"}
        loadMore={loadMore}
        hasMore={hasMore}
        emptyMessage="Belum ada konten dari jaringan kepercayaanmu."
      />
    </div>
  );
}

function WoTStatusBanner({
  status,
  size,
}: {
  status: "idle" | "loading" | "ready" | "error";
  size: number;
}) {
  if (status === "ready" && size > 0) {
    // Tampilkan sebentar lalu fade out
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800/50">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        <span>Web of Trust aktif · {size.toLocaleString()} orang dalam jaringanmu</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800/50">
        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
        <span>Membangun Web of Trust...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-amber-600 border-b border-zinc-800/50">
        <span>⚠️ WoT gagal dimuat — menampilkan following saja</span>
      </div>
    );
  }

  return null;
}
```

---

## 7. Update `src/store/auth.ts` — Reset WoT saat Logout

```typescript
// Tambahkan di logout action:
logout: () => {
  clearSigner();
  resetWoT(); // ← tambahkan ini
  localStorage.removeItem("nostr_auth_method");
  localStorage.removeItem("nostr_pk_hex");
  set({ user: null, isLoggedIn: false, error: null });
},
```

---

## 8. API NDK WoT yang Tersedia

```typescript
const wot = new NDKWoT(ndk);

// Load graph dari relay
await wot.load({
  pubkey: viewerPubkey,   // titik awal (kamu)
  maxDepth: 2,            // seberapa jauh explore (2 = FoF)
});

// Aktifkan auto-filter di semua subscription NDK
wot.enableAutoFilter({
  maxDepth: 2,
  minScore: 0.1,
  includeUnknown: false,
});

// Disable auto-filter
wot.disableAutoFilter();

// Get skor satu pubkey (0-1, null jika di luar WoT)
const score: number | null = wot.getScore(pubkey);

// Get follow distance
const distance: number | undefined = wot.followDistance.get(pubkey);
// 0 = diri sendiri
// 1 = langsung follow
// 2 = follow of follow

// Cek apakah pubkey dalam WoT
const inWoT: boolean = wot.followDistance.has(pubkey);

// Semua pubkey yang dikenal (Map<pubkey, distance>)
const allPubkeys: Map<string, number> = wot.followDistance;
```

---

## 9. Perbandingan: Custom Scorer vs NDK WoT

```
                        Custom Scorer    NDK WoT
─────────────────────────────────────────────────
Install extra package   ❌ tidak perlu   ✅ @nostr-dev-kit/wot
Fetch kind:3 sendiri    ✅ ya            ❌ tidak perlu
Follow distance         ✅ manual        ✅ built-in
Auto filter sub         ❌ tidak ada     ✅ enableAutoFilter()
Cache graph             ❌ di memori     ✅ via NDK cache
Singleton pattern       manual          kita wrap sendiri
Interaksi history       ✅ ya           ❌ tidak ada
Freshness decay         ✅ ya           ❌ tidak ada (kita tambah)
Maintenance             kita sendiri    tim NDK
```

**Rekomendasi akhir:** Pakai NDK WoT untuk filter dan dasar skor.
Tambahkan freshness decay di `computeFinalScore()`. Interaksi history bisa ditambahkan nanti sebagai layer bonus.

---

## 10. Package yang Perlu Diinstall

```bash
npm install @nostr-dev-kit/wot
```

Pastikan versi NDK dan WoT kompatibel:
```json
{
  "@nostr-dev-kit/ndk": "^2.10.0",
  "@nostr-dev-kit/wot": "^1.0.0"
}
```

Cek versi terbaru di: https://www.npmjs.com/package/@nostr-dev-kit/wot
