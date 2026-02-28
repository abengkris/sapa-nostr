"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";
import { Plus, Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import Image from "next/image";
import Link from "next/link";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoggedIn } = useAuthStore();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Mobile Header */}
      <div className="sm:hidden sticky top-0 z-20 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 py-3">
        <Link href={`/p/${user?.pubkey}`}>
          <Image
            src={user?.profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.pubkey}`}
            alt="Profile"
            width={32}
            height={32}
            className="rounded-full bg-gray-200"
            unoptimized={true}
          />
        </Link>
        <span className="font-bold text-lg">Sapa</span>
        <Link href="/notifications">
          <Bell size={24} />
        </Link>
      </div>

      <div className="max-w-7xl mx-auto flex h-full">
        {/* Sidebar (Bottom on mobile, Left on desktop) */}
        <header className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white dark:bg-black border-gray-200 dark:border-gray-800 sm:relative sm:flex sm:flex-col sm:w-20 lg:w-64 sm:border-t-0 sm:border-r">
          <Sidebar />
        </header>

        {/* Main Feed */}
        <main className="flex-1 min-h-screen border-r border-gray-200 dark:border-gray-800 pb-20 sm:pb-0">
          {children}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-80 xl:w-96 p-4">
          <RightPanel />
        </aside>
      </div>

      {/* Mobile FAB */}
      {isLoggedIn && (
        <button className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all">
          <Plus size={30} />
        </button>
      )}
    </div>
  );
};
