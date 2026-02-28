"use client";

import React from "react";
import { Search } from "lucide-react";

export const RightPanel = () => {
  return (
    <div className="space-y-4">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500" />
        </div>
        <input
          type="text"
          placeholder="Search Nostr..."
          className="block w-full pl-10 pr-3 py-2 border border-transparent rounded-full bg-gray-100 dark:bg-gray-900 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-blue-500 transition-all text-sm"
        />
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
        <h2 className="text-xl font-bold mb-4">What's happening</h2>
        <div className="space-y-4">
          <div className="group cursor-pointer">
            <p className="text-xs text-gray-500">Trending in Nostr</p>
            <p className="font-bold group-hover:underline">#SapaApp</p>
            <p className="text-xs text-gray-500">1.2K notes</p>
          </div>
          <div className="group cursor-pointer">
            <p className="text-xs text-gray-500">Protocol</p>
            <p className="font-bold group-hover:underline">NIP-07</p>
            <p className="text-xs text-gray-500">856 notes</p>
          </div>
        </div>
      </div>
    </div>
  );
};
