"use client";

import React, { useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";

export const ProfileSetupCard = ({ pubkey, npub }: { pubkey: string; npub: string }) => {
  const { profile, loading } = useProfile(pubkey);

  const steps = useMemo(() => {
    if (!profile) return [];
    return [
      { id: "name", label: "Set your name", completed: !!(profile.name || profile.displayName) },
      { id: "picture", label: "Upload a profile picture", completed: !!profile.picture },
      { id: "about", label: "Write a short bio", completed: !!profile.about },
      { id: "nip05", label: "Verify your identity (NIP-05)", completed: !!profile.nip05 },
    ];
  }, [profile]);

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (loading || progressPercent === 100) return null;

  return (
    <div className="m-4 p-4 bg-blue-50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Complete your profile</h3>
          <p className="text-xs text-blue-700 dark:text-blue-400">Boost your trust in the network</p>
        </div>
        <span className="text-sm font-black text-blue-600 dark:text-blue-400">{progressPercent}%</span>
      </div>

      <div className="w-full h-1.5 bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-2 text-xs">
            {step.completed ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Circle size={14} className="text-blue-300 dark:text-blue-800" />
            )}
            <span className={step.completed ? "text-gray-400 line-through" : "text-gray-700 dark:text-gray-300"}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <Link 
        href={`/${npub}`}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors"
      >
        Go to Profile
        <ArrowRight size={14} />
      </Link>
    </div>
  );
};
