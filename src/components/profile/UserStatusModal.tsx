"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Activity as StatusIcon, Music, Smile } from "lucide-react";
import { updateStatus } from "@/lib/actions/profile";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useUserStatus } from "@/hooks/useUserStatus";

interface UserStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  pubkey: string;
  onSuccess?: () => void;
}

export const UserStatusModal: React.FC<UserStatusModalProps> = ({
  isOpen,
  onClose,
  pubkey,
  onSuccess
}) => {
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const { generalStatus } = useUserStatus(pubkey);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (generalStatus?.content) {
      setStatus(generalStatus.content);
    }
  }, [generalStatus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk) return;

    setLoading(true);
    try {
      const success = await updateStatus(ndk, status, "general");
      if (success) {
        addToast("Status updated!", "success");
        onSuccess?.();
        onClose();
      } else {
        addToast("Failed to update status.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error updating status.", "error");
    } finally {
      setLoading(false);
    }
  };

  const clearStatus = async () => {
    if (!ndk) return;
    setLoading(true);
    try {
      const success = await updateStatus(ndk, "", "general");
      if (success) {
        setStatus("");
        addToast("Status cleared", "success");
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      addToast("Failed to clear status", "error");
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Building Tell it! 🚀",
    "Listening to music 🎵",
    "Coding in Termux 📱",
    "On a break ☕",
    "Traveling ✈️",
    "Sleeping 😴"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-black w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-black">Set Status</h2>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-full font-bold text-sm transition-all"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Update"}
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Current Activity</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-blue-500">
                <Smile size={20} />
              </div>
              <input
                type="text"
                autoFocus
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="What's happening?"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-widest text-gray-400 ml-1">Suggestions</label>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-800 rounded-full text-xs font-medium transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {status && (
            <button
              onClick={clearStatus}
              className="w-full py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl text-sm font-bold transition-colors"
            >
              Clear Current Status
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
