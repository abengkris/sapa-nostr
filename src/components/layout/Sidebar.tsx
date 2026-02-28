"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, LogIn, LogOut, Bell, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/lib/ndk";
import { useNotifications } from "@/hooks/useNotifications";

const SidebarItem = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) => {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center space-x-4 p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors relative ${
        active ? "font-bold" : ""
      }`}
    >
      <div className="relative">
        <Icon size={26} className={active ? "text-blue-500" : ""} strokeWidth={active ? 2.5 : 2} />
        {badge !== undefined && badge > 0 && (
          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-black">
            {badge > 9 ? "9+" : badge}
          </div>
        )}
      </div>
      <span className="hidden lg:block text-xl">{label}</span>
    </Link>
  );
};

export const Sidebar = () => {
  const { user, isLoggedIn, login, logout } = useAuthStore();
  const { ndk } = useNDK();
  const { unreadCount } = useNotifications();

  return (
    <div className="flex sm:flex-col items-center sm:items-start justify-around sm:justify-between h-16 sm:h-screen w-full sm:sticky sm:top-0 p-2 sm:p-4">
      <div className="flex sm:flex-col space-y-0 sm:space-y-4 w-full">
        <div className="hidden sm:block p-3">
          <div className="text-3xl font-bold text-blue-500">Sapa</div>
        </div>

        <SidebarItem href="/" icon={Home} label="Home" />
        <SidebarItem href="/search" icon={Search} label="Search" />
        
        {isLoggedIn && (
          <>
            <SidebarItem href="/notifications" icon={Bell} label="Notifications" badge={unreadCount} />
            <SidebarItem href="/messages" icon={MessageSquare} label="Messages" />
            <SidebarItem href={`/p/${user?.pubkey}`} icon={User} label="Profile" />
          </>
        )}
      </div>

      <div className="flex sm:flex-col w-full sm:mt-auto">
        {isLoggedIn ? (
          <button
            onClick={logout}
            className="hidden sm:flex items-center space-x-4 p-3 rounded-full hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 transition-colors w-full"
          >
            <LogOut size={26} />
            <span className="hidden lg:block text-xl">Logout</span>
          </button>
        ) : (
          <button
            onClick={() => ndk && login(ndk)}
            className="flex items-center space-x-4 p-3 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/10 text-blue-500 transition-colors w-full"
          >
            <LogIn size={26} />
            <span className="hidden lg:block text-xl">Login</span>
          </button>
        )}
      </div>
    </div>
  );
};
