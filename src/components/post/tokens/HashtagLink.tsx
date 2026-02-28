"use client";

import Link from "next/link";

export function HashtagLink({ tag }: { tag: string }) {
  return (
    <Link
      href={`/search?q=${tag}`}
      className="text-blue-500 hover:text-blue-600 hover:underline"
      onClick={e => e.stopPropagation()}
    >
      #{tag}
    </Link>
  );
}
