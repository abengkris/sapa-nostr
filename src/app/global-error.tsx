"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-white dark:bg-black text-black dark:text-white">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-6">
            <AlertCircle size={48} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tighter">Tell it! has encountered a critical error</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
            A system-level error occurred that prevented the application from loading.
          </p>
          <button
            onClick={() => reset()}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-black py-3 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <RotateCcw size={20} />
            <span>Restart Application</span>
          </button>
          
          {error.digest && (
            <p className="mt-8 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              Error ID: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
