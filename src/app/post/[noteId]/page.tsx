"use client";

import React, { use } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useThread } from "@/hooks/useThread";
import { decodeNip19 } from "@/lib/utils/nip19";

export default function PostDetailPage({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = use(params);
  const { id: hexId, relays } = decodeNip19(noteId);
  const { 
    focalPost, 
    ancestors, 
    replies, 
    loading, 
    loadingReplies, 
    hasMoreReplies, 
    loadMoreReplies 
  } = useThread(hexId, relays);
  const router = useRouter();

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-3 space-x-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Thread</h1>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <>
            {/* Ancestors with connecting lines */}
            {ancestors.map((parent, index) => (
              <PostCard 
                key={parent.id} 
                event={parent} 
                threadLine={index === 0 && ancestors.length === 1 ? "bottom" : (index === 0 ? "bottom" : "both")} 
              />
            ))}

            {/* Focal Post */}
            {focalPost && (
              <PostCard 
                event={focalPost} 
                isFocal={true} 
                threadLine={ancestors.length > 0 ? "top" : "none"} 
              />
            )}
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 text-xs font-bold text-gray-500 uppercase tracking-widest">
              Replies
            </div>

            {/* Direct Replies */}
            {replies.length > 0 ? (
              <>
                {replies.map(reply => <PostCard key={reply.id} event={reply} />)}
                {hasMoreReplies && (
                  <div className="p-8 text-center">
                    <button 
                      onClick={() => loadMoreReplies()}
                      disabled={loadingReplies}
                      className="text-blue-500 text-sm font-bold hover:underline disabled:opacity-50"
                    >
                      {loadingReplies ? "Loading..." : "Load more"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center text-gray-500 italic text-sm">
                No replies yet.
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
