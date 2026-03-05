'use client';

import { useState, useEffect } from 'react';

export type NIP05Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export function useNIP05(pubkey: string | undefined, nip05: string | undefined) {
  const [status, setStatus] = useState<NIP05Status>('idle');

  useEffect(() => {
    let isMounted = true;

    if (!pubkey || !nip05) {
      setStatus('idle');
      return;
    }

    if (!nip05.includes('@')) {
      setStatus('invalid');
      return;
    }
    
    setStatus('loading');

    const verify = async () => {
      try {
        const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(nip05)}`);
        
        if (!isMounted) return;

        if (!res.ok) {
          setStatus('error');
          return;
        }

        const data = await res.json();
        const [name] = nip05.split('@');
        
        const foundPubkey = data.names?.[name];

        if (isMounted) {
          setStatus(foundPubkey === pubkey ? 'valid' : 'invalid');
        }
      } catch (err) {
        if (isMounted) {
          console.error('NIP-05 verification error:', err);
          setStatus('error');
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [pubkey, nip05]);

  return status;
}
