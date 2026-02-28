import '@testing-library/jest-dom';
import { vi } from 'vitest';

// No global NDK mock anymore because we'll use NDK Test Utils.
// But we might need to mock browser-only things if necessary.

vi.mock('nostr-tools', () => ({
  nip19: {
    decode: vi.fn().mockReturnValue({ data: 'decoded-pubkey' }),
    encode: vi.fn().mockReturnValue('npub1...'),
  },
}));
