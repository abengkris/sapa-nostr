"use client";

import React, { use, useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNDK } from "@/lib/ndk";
import { NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk";
import { PostCard } from "@/components/post/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PostDetailPage({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = use(params);
  const { ndk, isReady } = useNDK();
  const [rootPost, setRootPost] = useState<NDKEvent | null>(null);
  const [parents, setParents] = useState<NDKEvent[]>([]);
  const [replies, setReplies] = useState<NDKEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!ndk || !isReady || !noteId) return;

    const fetchPostAndReplies = async () => {
      setLoading(true);
      try {
        // 1. Fetch the actual post
        const event = await ndk.fetchEvent(noteId);
        if (event) {
          setRootPost(event);

          // 2. Fetch parents (ancestors)
          const parentIds = event.tags
            .filter(t => t[0] === 'e' && (t[3] === 'root' || t[3] === 'reply'))
            .map(t => t[1]);
          
          if (parentIds.length > 0) {
            const parentEvents = await ndk.fetchEvents({ ids: parentIds });
            setParents(Array.from(parentEvents).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)));
          }
        }

        // 3. Fetch replies
        const filter: NDKFilter = {
          kinds: [1],
          "#e": [noteId],
        };
        const replyEvents = await ndk.fetchEvents(filter);
        setReplies(Array.from(replyEvents).sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndReplies();
  }, [ndk, isReady, noteId]);

  return (
    <MainLayout>
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center px-4 py-3 space-x-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Post</h1>
      </div>

      <div className="pb-20">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        ) : (
          <>
            {/* Thread Parents */}
            {parents.map(parent => (
              <div key={parent.id} className="opacity-70 scale-[0.98] origin-top transition-all hover:opacity-100">
                <PostCard event={parent} />
              </div>
            ))}

            {rootPost && <div className="border-l-4 border-blue-500 bg-blue-50/10 dark:bg-blue-900/5"><PostCard event={rootPost} /></div>}
            
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 text-sm font-bold text-gray-500 uppercase tracking-wider">
              Replies
            </div>

            {replies.length > 0 ? (
              replies.map(reply => <PostCard key={reply.id} event={reply} />)
            ) : (
              <div className="p-12 text-center text-gray-500 italic">
                No replies yet.
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
