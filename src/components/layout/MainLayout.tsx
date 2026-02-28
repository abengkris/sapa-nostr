"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { RightPanel } from "./RightPanel";

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-7xl mx-auto flex h-full">
        {/* Sidebar */}
        <header className="fixed bottom-0 left-0 right-0 z-20 border-t bg-white dark:bg-black border-gray-200 dark:border-gray-800 sm:relative sm:flex sm:flex-col sm:w-20 lg:w-64 sm:border-t-0 sm:border-r">
          <Sidebar />
        </header>

        {/* Main Feed */}
        <main className="flex-1 min-h-screen border-r border-gray-200 dark:border-gray-800 pb-16 sm:pb-0">
          {children}
        </main>

        {/* Right Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-80 xl:w-96 p-4">
          <RightPanel />
        </aside>
      </div>
    </div>
  );
};
