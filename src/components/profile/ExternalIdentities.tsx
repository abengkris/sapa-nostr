"use client";

import React from "react";
import { ExternalIdentity } from "@/hooks/useLists";
import { Github, Twitter, Send, Globe, ShieldCheck } from "lucide-react";

interface ExternalIdentitiesProps {
  identities: ExternalIdentity[];
}

export const ExternalIdentities: React.FC<ExternalIdentitiesProps> = ({ identities }) => {
  if (!identities || identities.length === 0) return null;

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "github": return <Github size={14} />;
      case "twitter": return <Twitter size={14} />;
      case "telegram": return <Send size={14} />;
      default: return <Globe size={14} />;
    }
  };

  const getPlatformUrl = (identity: ExternalIdentity) => {
    const { platform, identity: id, proof } = identity;
    switch (platform.toLowerCase()) {
      case "github":
        return `https://gist.github.com/${id}/${proof}`;
      case "twitter":
        return `https://twitter.com/${id}/status/${proof}`;
      case "telegram":
        return `https://t.me/${proof}`;
      case "mastodon":
        return `https://${id}/${proof}`;
      default:
        return "#";
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {identities.map((identity, index) => (
        <a
          key={`${identity.platform}-${identity.identity}-${index}`}
          href={getPlatformUrl(identity)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/30 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-green-100 dark:hover:bg-green-900/20 transition-all group"
          title={`Verified ${identity.platform} identity: ${identity.identity}`}
        >
          {getPlatformIcon(identity.platform)}
          <span>{identity.identity.split('/')[identity.identity.split('/').length - 1]}</span>
          <ShieldCheck size={10} className="text-green-500 fill-current opacity-50 group-hover:opacity-100" />
        </a>
      ))}
    </div>
  );
};
