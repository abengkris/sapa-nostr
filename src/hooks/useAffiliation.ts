'use client';

import { useState, useEffect } from 'react';

const affiliationCache: Record<string, string> = {};

export function useAffiliation(nip05: string | undefined) {
  const [affiliationPubkey, setAffiliationPubkey] = useState<string | null>(null);

  useEffect(() => {
    if (!nip05 || !nip05.includes('@')) {
      if (affiliationPubkey !== null) Promise.resolve().then(() => setAffiliationPubkey(null));
      return;
    }

    const [name, domain] = nip05.split('@');
    
    // If the name is already '_', it's the root identity, no need to show affiliation with itself
    if (name === '_') {
      if (affiliationPubkey !== null) Promise.resolve().then(() => setAffiliationPubkey(null));
      return;
    }

    if (affiliationCache[domain]) {
      if (affiliationPubkey !== affiliationCache[domain]) {
        Promise.resolve().then(() => setAffiliationPubkey(affiliationCache[domain]));
      }
      return;
    }

    let isMounted = true;

    const fetchAffiliation = async () => {
      try {
        const identifier = `_@${domain}`;
        const res = await fetch(`/api/nip05?identifier=${encodeURIComponent(identifier)}`);
        
        if (!isMounted || !res.ok) return;

        const data = await res.json();
        const rootPubkey = data.names?.['_'];

        if (rootPubkey && isMounted) {
          affiliationCache[domain] = rootPubkey;
          setAffiliationPubkey(rootPubkey);
        }
      } catch (err) {
        // Silent error for affiliation check
        /* eslint-disable-line @typescript-eslint/no-unused-vars */
      }
    };

    fetchAffiliation();

    return () => {
      isMounted = false;
    };
  }, [nip05]); // eslint-disable-line react-hooks/exhaustive-deps

  return affiliationPubkey;
}
