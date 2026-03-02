"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import Link from "next/link";
import { decodeNip19 } from "@/lib/utils/nip19";

interface ArticleRendererProps {
  content: string;
  event: NDKEvent;
}

export function ArticleRenderer({ content, event }: ArticleRendererProps) {
  // Process nostr: links in the content to make them clickable/navigable if they aren't already in Markdown
  // But ReactMarkdown handles [text](url) fine. We mostly care about naked nostr:npub... etc.
  
  return (
    <div className="prose prose-lg dark:prose-invert prose-blue max-w-none 
      selection:bg-blue-500/20
      prose-headings:font-black prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-white
      prose-p:leading-[1.8] prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:mb-6
      prose-img:rounded-3xl prose-img:border prose-img:border-gray-200 dark:prose-img:border-gray-800 prose-img:my-12
      prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-code:font-medium
      prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50/50 dark:prose-blockquote:bg-blue-950/20 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic prose-blockquote:my-10
      prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2
      prose-hr:border-gray-100 dark:prose-hr:border-gray-800 prose-hr:my-16
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Syntax Highlighting for Code Blocks
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <div className="relative group rounded-2xl overflow-hidden my-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                    {match[1]}
                  </span>
                </div>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    fontSize: '0.9rem',
                    backgroundColor: 'rgb(10, 10, 10)',
                  }}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom Link Handling (including nostr: URIs)
          a: ({ node, href, children, ...props }) => {
            if (!href) return <span>{children}</span>;

            // Handle Nostr Links
            if (href.startsWith("nostr:") || href.startsWith("web+nostr:")) {
              const raw = href.replace(/^(web\+)?nostr:/, "");
              try {
                const { id, kind, pubkey, identifier } = decodeNip19(raw);
                
                let targetUrl = `/post/${raw}`; // Default
                if (raw.startsWith("npub1") || raw.startsWith("nprofile1")) {
                  targetUrl = `/${raw}`;
                } else if (raw.startsWith("naddr1") || kind === 30023) {
                  targetUrl = `/article/${raw}`;
                }

                return (
                  <Link href={targetUrl} className="text-blue-500 hover:underline font-bold">
                    {children}
                  </Link>
                );
              } catch (e) {
                return <span className="text-red-500 underline">{children}</span>;
              }
            }

            // External Links
            return (
              <a 
                href={href} 
                className="text-blue-500 hover:underline font-bold decoration-blue-500/30 underline-offset-4 transition-all hover:decoration-blue-500" 
                target="_blank" 
                rel="noopener noreferrer" 
                {...props}
              >
                {children}
              </a>
            );
          },
          // Responsive Images
          img: ({ node, src, alt, ...props }) => (
            <div className="my-8 flex flex-col items-center">
              <img 
                src={src} 
                alt={alt || ""} 
                className="rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 max-h-[70vh] object-contain transition-transform hover:scale-[1.01]" 
                loading="lazy"
                {...props} 
              />
              {alt && (
                <span className="text-sm text-gray-500 mt-3 font-medium italic">
                  {alt}
                </span>
              )}
            </div>
          ),
          // Better Headings
          h1: ({ children }) => <h1 className="text-4xl mt-12 mb-6">{children}</h1>,
          h2: ({ children }) => <h2 className="text-3xl mt-10 mb-4 pb-2 border-b border-gray-100 dark:border-gray-900">{children}</h2>,
          h3: ({ children }) => <h3 className="text-2xl mt-8 mb-3">{children}</h3>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
