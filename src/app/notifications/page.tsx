"use client";

import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNotifications } from "@/hooks/useNotifications";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, Heart, Repeat2, MessageCircle, Zap, UserPlus } from "lucide-react";
import Link from "next/link";

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'like': return <Heart size={20} className="text-pink-500" fill="currentColor" />;
    case 'repost': return <Repeat2 size={20} className="text-green-500" />;
    case 'reply': return <MessageCircle size={20} className="text-blue-500" fill="currentColor" />;
    case 'zap': return <Zap size={20} className="text-yellow-500" fill="currentColor" />;
    case 'mention': return <MessageCircle size={20} className="text-purple-500" />;
    default: return null;
  }
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, loading, loadMore, hasMore } = useNotifications();

  React.useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-xl font-bold">Notifications</h1>
      </div>

      <div className="pb-20">
        {loading && notifications.length === 0 ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500 text-center">
            <div className="bg-gray-100 dark:bg-gray-900 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="opacity-20" />
            </div>
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="text-sm mt-2">Interactions with your posts will appear here.</p>
          </div>
        ) : (
          <>
            {notifications.map((notif) => (
              <div key={notif.id} className="border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                <div className="flex p-4 space-x-3">
                  <div className="shrink-0 pt-1">
                    <NotificationIcon type={notif.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.pubkey}`} 
                        className="w-8 h-8 rounded-full bg-gray-200"
                        alt="User"
                      />
                      <Link href={`/${notif.pubkey}`} className="font-bold hover:underline truncate">
                        {notif.pubkey.slice(0, 8)}...
                      </Link>
                      <span className="text-gray-500 text-sm">
                        {notif.type === 'like' && "liked your post"}
                        {notif.type === 'repost' && "reposted your post"}
                        {notif.type === 'reply' && "replied to your post"}
                        {notif.type === 'zap' && "zapped your post"}
                        {notif.type === 'mention' && "mentioned you"}
                      </span>
                    </div>
                    
                    {notif.kind === 1 && (
                      <div className="text-gray-600 dark:text-gray-400 text-sm border-l-2 border-gray-200 dark:border-gray-800 pl-3 py-1 italic">
                        {notif.content.length > 100 ? notif.content.slice(0, 100) + "..." : notif.content}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="p-8 text-center">
                <button 
                  onClick={() => loadMore()}
                  disabled={loading}
                  className="text-blue-500 text-sm font-bold hover:underline disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
