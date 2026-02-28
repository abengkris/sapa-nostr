"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { publishPost } from "@/lib/actions/post";
import { ImageIcon, Calendar, Smile, MapPin } from "lucide-react";
import Image from "next/image";

export const PostComposer = () => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, isLoggedIn } = useAuthStore();
  const { ndk } = useNDK();

  const handlePost = async () => {
    if (!ndk || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await publishPost(ndk, content);
      setContent("");
      // Success: ideally trigger a feed refresh here
    } catch (err) {
      console.error("Failed to post:", err);
      alert("Failed to publish post. Make sure your NIP-07 extension is ready.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="flex p-4 border-b border-gray-200 dark:border-gray-800">
      <div className="mr-3 shrink-0">
        <Image
          src={user?.profile?.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.pubkey}`}
          alt="Avatar"
          width={48}
          height={48}
          className="w-12 h-12 rounded-full object-cover bg-gray-200"
          unoptimized={true}
        />
      </div>
      
      <div className="flex-1">
        <label htmlFor="post-content" className="sr-only">Post content</label>
        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={2}
          className="w-full text-xl bg-transparent border-none focus:ring-0 resize-none placeholder-gray-500 min-h-[100px]"
        />
        
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-900 pt-3 mt-3">
          <div className="flex items-center space-x-1 text-blue-500">
            <button 
              aria-label="Add image"
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
            >
              <ImageIcon size={20} />
            </button>
            <button 
              aria-label="Add emoji"
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
            >
              <Smile size={20} />
            </button>
            <button 
              aria-label="Schedule post"
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors opacity-50 cursor-not-allowed"
            >
              <Calendar size={20} />
            </button>
            <button 
              aria-label="Add location"
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors opacity-50 cursor-not-allowed"
            >
              <MapPin size={20} />
            </button>
          </div>
          
          <button
            onClick={handlePost}
            disabled={!content.trim() || isSubmitting}
            className={`px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full transition-colors ${
              (!content.trim() || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};
