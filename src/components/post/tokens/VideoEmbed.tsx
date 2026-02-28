"use client";

export function VideoEmbed({ url }: { url: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black max-h-[450px] sm:max-h-[550px] border border-gray-200 dark:border-gray-800 w-full mt-3 flex items-center justify-center">
      <video
        src={url}
        controls
        className="max-w-full max-h-[450px] sm:max-h-[550px] block"
        preload="metadata"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
