"use client";

import React, { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export const RightPanel = () => {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  return (
    <div className="space-y-4">
      <section className="relative group">
        <form onSubmit={handleSearch}>
          <label htmlFor="right-panel-search" className="sr-only">Search Nostr</label>
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            id="right-panel-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Nostr..."
            className="block w-full pl-11 pr-4 py-2.5 border border-transparent rounded-full bg-gray-100 dark:bg-gray-900 focus:outline-none focus:bg-white dark:focus:bg-black focus:ring-1 focus:ring-blue-500 transition-all text-sm"
          />
        </form>
      </section>

      <section className="bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-bold p-4 pb-2">What's happening</h2>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <div className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
            <p className="text-xs text-gray-500 mb-0.5">Trending in Nostr</p>
            <p className="font-bold text-sm">#SapaApp</p>
            <p className="text-xs text-gray-500 mt-0.5">1.2K notes</p>
          </div>
          <div className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
            <p className="text-xs text-gray-500 mb-0.5">Protocol</p>
            <p className="font-bold text-sm">NIP-07</p>
            <p className="text-xs text-gray-500 mt-0.5">856 notes</p>
          </div>
          <div className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
            <button className="text-blue-500 text-sm hover:underline font-medium">Show more</button>
          </div>
        </div>
      </section>
    </div>
  );
};
