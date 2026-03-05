'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProfile } from '@/hooks/useProfile';
import { toNpub } from '@/lib/utils/nip19';

interface AffiliationBadgeProps {
  affiliationPubkey: string;
  isPost?: boolean;
}

export const AffiliationBadge: React.FC<AffiliationBadgeProps> = ({
  affiliationPubkey,
  isPost = false,
}) => {
  const { profile, loading } = useProfile(affiliationPubkey);

  if (loading || !profile?.picture) return null;

  const size = isPost ? 16 : 22;
  const npub = toNpub(affiliationPubkey);

  return (
    <Link 
      href={`/${npub}`}
      className="shrink-0 transition-transform hover:scale-110 active:scale-95"
      onClick={(e) => e.stopPropagation()}
      title={`Affiliated with ${profile.name || profile.displayName || 'Organization'}`}
    >
      <div 
        className="rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-white/20 shadow-sm"
        style={{ width: size, height: size }}
      >
        <Image
          src={profile.picture}
          alt=""
          width={size}
          height={size}
          className="object-cover w-full h-full"
          unoptimized
        />
      </div>
    </Link>
  );
};
