"use client";

import React from "react";
import { useUIStore } from "@/store/ui";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-24 sm:bottom-8 right-4 left-4 sm:left-auto sm:right-8 z-[100] flex flex-col space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-xl border animate-in slide-in-from-right-4 fade-in duration-300 min-w-[280px] max-w-md ${
            toast.type === "success"
              ? "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800 text-green-800 dark:text-green-400"
              : toast.type === "error"
              ? "bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800 text-red-800 dark:text-red-400"
              : "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 text-blue-800 dark:text-blue-400"
          }`}
        >
          <div className="flex items-center space-x-3">
            {toast.type === "success" && <CheckCircle2 size={20} />}
            {toast.type === "error" && <AlertCircle size={20} />}
            {toast.type === "info" && <Info size={20} />}
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
