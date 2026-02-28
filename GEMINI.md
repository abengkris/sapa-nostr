# GEMINI.md — Project Context

## Tentang Proyek
Aplikasi microblogging berbasis protokol Nostr (seperti X/Twitter).
Menggunakan @nostr-dev-kit/ndk untuk koneksi ke relay.

## Tech Stack
- Framework: Next.js latest (App Router)
- Nostr SDK: @nostr-dev-kit/ndk
- Styling: TailwindCSS
- State: Zustand
- Auth: Nostr keypair (NIP-07 browser extension / NIP-46)

## Konvensi Kode
- Komponen: PascalCase
- Hook custom: use prefix (useNostr, useFeed)
- Event Nostr selalu divalidasi sebelum ditampilkan
- Selalu handle loading dan error state
