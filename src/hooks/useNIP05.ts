'use client';

import { useState, useEffect } from 'react';

export type NIP05Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export function useNIP05(pubkey: string | undefined, nip05: string | undefined) {
  const [status, setStatus] = useState<NIP05Status>('idle');

  useEffect(() => {
    if (!pubkey || !nip05) {
      setStatus('idle');
      return;
    }

    // Basic format check
    if (!nip05.includes('@')) {
      setStatus('invalid');
      return;
    }

    let isMounted = true;
    setStatus('loading');

    const verify = async () => {
      try {
        const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(nip05)}`);
        
        if (!res.ok) {
          if (isMounted) setStatus('error');
          return;
        }

        const data = await res.json();
        const [name] = nip05.split('@');
        
        // NIP-05 spec: names mapping to pubkeys
        const foundPubkey = data.names?.[name];

        if (isMounted) {
          if (foundPubkey === pubkey) {
            setStatus('valid');
          } else {
            setStatus('invalid');
          }
        }
      } catch (err) {
        console.error('NIP-05 verification error:', err);
        if (isMounted) setStatus('error');
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [pubkey, nip05]);

  return status;
}
