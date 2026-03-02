# GEMINI.md — Project Context

## Tentang Proyek
Aplikasi microblogging berbasis protokol Nostr (seperti X/Twitter) dengan nama brand **Tell it!**.
Slogan: "Whatever it is, just Tell It."
Domain: tellit.id

## Tech Stack
- Framework: Next.js latest (App Router)
- Nostr SDK: NDK (@nostr-dev-kit/ndk)
- Messaging: @nostr-dev-kit/messages (NIP-17)
- Styling: TailwindCSS
- State: Zustand
- Auth: Nostr keypair (NIP-07 browser extension / NIP-46)

## Konvensi Kode
- Komponen: PascalCase
- Hook custom: use prefix (useNostr, useFeed)
- Event Nostr selalu divalidasi sebelum ditampilkan
- Selalu handle loading dan error state
