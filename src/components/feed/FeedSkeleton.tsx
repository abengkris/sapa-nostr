import React from "react";

export const FeedSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 dark:bg-gray-800 h-12 w-12" />
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
