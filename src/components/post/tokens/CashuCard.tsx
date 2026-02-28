"use client";

import React from "react";
import { useUIStore } from "@/store/ui";

interface CashuCardProps {
  token: string;
}

export function CashuCard({ token }: { token: string }) {
  const { addToast } = useUIStore();
  
  // Attempt to decode amount if cashuA
  let amount: number | null = null;
  if (token.startsWith("cashuA")) {
    try {
      const json = JSON.parse(atob(token.slice(6)));
      amount = json.token?.[0]?.proofs?.reduce(
        (sum: number, p: { amount: number }) => sum + p.amount, 0
      ) ?? null;
    } catch {}
  }

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(token);
    addToast("Cashu token copied!", "success");
  };

  return (
    <div className="border border-green-500/30 bg-green-500/5 dark:bg-green-500/10 rounded-2xl p-4 flex items-center gap-4 mt-3 max-w-full overflow-hidden">
      <div className="shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-xl">
        🥜
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-green-700 dark:text-green-400 font-bold truncate">
          {amount ? `${amount} sats (Cashu)` : "Cashu Token"}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-xs font-mono truncate break-all">
          {token.slice(0, 24)}…
        </p>
      </div>
      <button
        onClick={copy}
        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-lg shadow-green-500/20"
      >
        Copy
      </button>
    </div>
  );
}
