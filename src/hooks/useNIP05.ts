'use client';

import { useState, useEffect } from 'react';

export type NIP05Status = 'idle' | 'loading' | 'valid' | 'invalid' | 'error';

export function useNIP05(pubkey: string | undefined, nip05: string | undefined) {
  const [status, setStatus] = useState<NIP05Status>('idle');

  useEffect(() => {
    let isMounted = true;

    if (!pubkey || !nip05) {
      if (isMounted) setStatus('idle');
      return;
    }

    // Basic format check
    if (!nip05.includes('@')) {
      if (isMounted) setStatus('invalid');
      return;
    }
    
    // Asynchronously set loading to avoid sync update warning if possible, 
    // though setting state at start of effect is generally allowed if not conditional on render phase.
    // However, to be safe and consistent:
    if (isMounted) setStatus('loading');

    const verify = async () => {
      try {
        const [name, domain] = nip05.split('@');
        if (!domain) {
          if (isMounted) setStatus('invalid');
          return;
        }

        const res = await fetch(`https://${domain}/.well-known/nostr.json?name=${name}`);
        
        if (!res.ok) {
          if (isMounted) setStatus('error');
          return;
        }

        const data = await res.json();
        
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
