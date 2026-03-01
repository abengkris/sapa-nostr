"use client";

import React from "react";
import { X, Code, Copy, Check } from "lucide-react";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useUIStore } from "@/store/ui";

interface RawEventModalProps {
  event: NDKEvent;
  isOpen: boolean;
  onClose: () => void;
}

export const RawEventModal: React.FC<RawEventModalProps> = ({ event, isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useUIStore();

  if (!isOpen) return null;

  const rawJson = JSON.stringify(event.rawEvent(), null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rawJson);
    setCopied(true);
    addToast("Event JSON copied!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2 text-gray-500">
            <Code size={20} />
            <h3 className="font-bold text-lg">Raw Event Data</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-blue-500"
              title="Copy JSON"
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
            <button 
              onClick={onClose} 
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-0 overflow-y-auto bg-gray-50 dark:bg-black/40">
          <pre className="p-6 text-xs font-mono overflow-x-auto text-gray-800 dark:text-gray-300 whitespace-pre-wrap break-all">
            {rawJson}
          </pre>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-white dark:bg-gray-900">
          <p className="text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">
            Protocol Transparency · NIP-01
          </p>
        </div>
      </div>
    </div>
  );
};
