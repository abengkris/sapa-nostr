# Web of Trust (WoT) Evolution Plan

This document tracks the improvements for the Tell it! WoT ranking engine.

## Status: Progressive Rollout (v0.3.0)

### 1. Dexie Migration ✅ (Completed)
Migrated `tellit_wot_cache_` from `localStorage` to IndexedDB using a dedicated Dexie database.
- **Target:** `src/hooks/useWoT.ts`
- **Result:** Faster loads, no main-thread blocking, and virtually unlimited graph size.

### 2. Algorithmic Refinement ✅ (Completed)
Implemented intersection-based weighting and scoring memoization.
- **Target:** `rankByWoT` in `src/hooks/useForYouFeed.ts`
- **Logic:** Users followed by multiple mutuals are boosted using `1 + log10(mutuals)`.

### 3. Spam Shield UI ✅ (Completed)
Added a "Spam Shield" toggle to the home feed.
- **Target:** `src/app/page.tsx`
- **Logic:** `if (wotStrictMode) posts.filter(score > 0)`.

### 4. Resilience ✅ (Completed)
Added retry logic with exponential backoff to the background loader.
- **Target:** `useWoT.ts`
- **Logic:** Retries up to 3 times with increasing delays (2s, 4s, 8s).

---
*Last Updated: 2026-03-03*
