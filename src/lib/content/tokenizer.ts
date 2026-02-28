import { nip19 } from "nostr-tools";

export type TokenType =
  | "text"
  | "mention"       // nostr:npub1 / nostr:nprofile1
  | "note_ref"      // nostr:note1 / nostr:nevent1 → quote embed
  | "hashtag"       // #bitcoin
  | "image"         // URL .jpg .png .gif .webp .avif
  | "video"         // URL .mp4 .mov .webm
  | "url"           // URL lainnya
  | "linebreak"     // \n
  | "emoji"         // :emoji: (NIP-30)
  | "nip08";        // #[0] (NIP-08)

export interface Token {
  type: TokenType;
  value: string;         // teks asli (raw dari content)
  decoded?: DecodedRef;  // hasil decode bech32 (jika berlaku)
}

export interface DecodedRef {
  type: "npub" | "nprofile" | "note" | "nevent";
  pubkey?: string;   // untuk mention
  eventId?: string;  // untuk note_ref
  relays?: string[]; // untuk nprofile/nevent
}

// Regex patterns — URUTAN PENTING
const PATTERNS: { re: RegExp; type: TokenType }[] = [
  // nostr: references (spesifik ke umum)
  { re: /nostr:nevent1[a-z0-9]+/gi,   type: "note_ref"  },
  { re: /nostr:nprofile1[a-z0-9]+/gi, type: "mention"   },
  { re: /nostr:note1[a-z0-9]+/gi,     type: "note_ref"  },
  { re: /nostr:npub1[a-z0-9]+/gi,     type: "mention"   },
  // NIP-30 Custom Emoji
  { re: /:\w+:/g,                     type: "emoji"     },
  // NIP-08 Mentions
  { re: /#\[\d+\]/g,                  type: "nip08"     },
  // Media URL (sebelum URL biasa)
  { re: /https?:\/\/\S+\.(?:jpg|jpeg|png|gif|webp|avif|svg)(\?\S*)?/gi, type: "image" },
  { re: /https?:\/\/\S+\.(?:mp4|mov|webm|ogg)(\?\S*)?/gi,           type: "video" },
  // URL biasa
  { re: /https?:\/\/[^\s\])"']+/gi,   type: "url"       },
  // Hashtag
  { re: /#[a-zA-Z]\w*/g,              type: "hashtag"   },
];

export function tokenize(content: string): Token[] {
  if (!content) return [];

  // Kumpulkan semua match dari semua pattern, simpan posisinya
  interface RawMatch {
    start: number;
    end: number;
    value: string;
    type: TokenType;
  }

  const matches: RawMatch[] = [];

  for (const { re, type } of PATTERNS) {
    re.lastIndex = 0; // reset stateful regex
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        value: m[0],
        type,
      });
    }
  }

  // Sort by position, hapus overlap (ambil yang lebih spesifik = lebih dulu di PATTERNS)
  matches.sort((a, b) => a.start - b.start);

  const filtered: RawMatch[] = [];
  let lastEnd = 0;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      filtered.push(match);
      lastEnd = match.end;
    }
    // overlap → skip (sudah tertangkap oleh pattern sebelumnya)
  }

  // Build final tokens, sisipkan TEXT di antara match
  const tokens: Token[] = [];
  let cursor = 0;

  for (const match of filtered) {
    // Teks sebelum match ini
    if (match.start > cursor) {
      const text = content.slice(cursor, match.start);
      // Split berdasarkan newline
      tokens.push(...splitByLinebreak(text));
    }

    tokens.push({
      type: match.type,
      value: match.value,
      decoded: decodeRef(match.value, match.type),
    });

    cursor = match.end;
  }

  // Sisa teks setelah match terakhir
  if (cursor < content.length) {
    tokens.push(...splitByLinebreak(content.slice(cursor)));
  }

  return tokens;
}

function splitByLinebreak(text: string): Token[] {
  const parts = text.split(/(\n)/);
  return parts
    .filter(p => p !== "")
    .map(p => ({
      type: p === "\n" ? "linebreak" : "text",
      value: p,
    } as Token));
}

function decodeRef(value: string, type: TokenType): DecodedRef | undefined {
  if (type !== "mention" && type !== "note_ref") return undefined;

  try {
    const bech32Part = value.replace(/^nostr:/, "");
    const decoded = nip19.decode(bech32Part);

    if (decoded.type === "npub") {
      return { type: "npub", pubkey: decoded.data };
    }
    if (decoded.type === "nprofile") {
      return { type: "nprofile", pubkey: decoded.data.pubkey, relays: decoded.data.relays };
    }
    if (decoded.type === "note") {
      return { type: "note", eventId: decoded.data };
    }
    if (decoded.type === "nevent") {
      return { type: "nevent", eventId: decoded.data.id, relays: decoded.data.relays };
    }
  } catch {
    // Bech32 tidak valid, abaikan
  }
  return undefined;
}
