"use client";

import React, { useState } from "react";
import { X, Flag, Loader2, AlertCircle } from "lucide-react";
import { useNDK } from "@/hooks/useNDK";
import { reportContent, ReportType } from "@/lib/actions/report";
import { useUIStore } from "@/store/ui";

interface ReportModalProps {
  targetPubkey: string;
  targetEventId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_TYPES: { type: ReportType; label: string; description: string }[] = [
  { type: "spam", label: "Spam", description: "Malicious links, fake accounts, or repetitive content" },
  { type: "impersonation", label: "Impersonation", description: "Pretending to be someone else" },
  { type: "nudity", label: "Nudity or NSFW", description: "Sexually explicit content" },
  { type: "profanity", label: "Profanity", description: "Hate speech or offensive language" },
  { type: "illegal", label: "Illegal", description: "Content that violates local laws" },
  { type: "malware", label: "Malware", description: "Links to viruses or phishing sites" },
  { type: "other", label: "Other", description: "Something else not listed above" },
];

export const ReportModal: React.FC<ReportModalProps> = ({ 
  targetPubkey, 
  targetEventId, 
  isOpen, 
  onClose 
}) => {
  const { ndk } = useNDK();
  const { addToast } = useUIStore();
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!ndk || !selectedType) return;

    setIsSubmitting(true);
    try {
      const success = await reportContent(ndk, selectedType, targetPubkey, targetEventId, reason);
      if (success) {
        addToast("Report sent successfully. Thank you for keeping Sapa safe.", "success");
        onClose();
      } else {
        addToast("Failed to send report.", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("An error occurred while reporting.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-2 text-red-500">
            <Flag size={20} />
            <h3 className="font-bold text-lg">Report Content</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-200">
            <AlertCircle size={16} className="shrink-0" />
            <p>
              Reports are public events (kind 1984) sent to relays. They help clients and relays filter content but do not guarantee removal from the decentralized network.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Why are you reporting this?</label>
            <div className="space-y-2">
              {REPORT_TYPES.map((item) => (
                <button
                  key={item.type}
                  onClick={() => setSelectedType(item.type)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedType === item.type
                      ? "border-red-500 bg-red-50 dark:bg-red-950/20 ring-1 ring-red-500"
                      : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <p className={`font-bold text-sm ${selectedType === item.type ? "text-red-600 dark:text-red-400" : ""}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pb-2">
            <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">Additional Context (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide more details to help us understand the issue..."
              rows={3}
              className="w-full p-4 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm resize-none"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Flag size={18} />
                <span>Submit Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
