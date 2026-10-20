"use client";

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * react-markdown's default sanitizer rejects every protocol outside
 * `http(s)|irc(s)|mailto|xmpp`, which silently blanks the src of inline base64 images
 * (`data:image/png;base64,…`) — the image just disappears. Allow those through and
 * delegate everything else, so `javascript:` and `data:text/html` are still stripped.
 */
function urlTransform(url: string): string {
  return url.startsWith("data:image/") ? url : defaultUrlTransform(url);
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none dark:prose-invert ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeSlug]}
        urlTransform={urlTransform}
        components={{
          // Ensure images are responsive
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || ""}
              className="rounded-lg"
              loading="lazy"
              {...props}
            />
          ),
          // Code blocks — styling handled by highlight.js + globals.css
          pre: ({ children, ...props }) => (
            <pre className="not-prose" {...props}>
              {children}
            </pre>
          ),
          // Inline code
          code: ({ children, className: codeClass, ...props }) => {
            const isInline = !codeClass;
            if (isInline) {
              return (
                <code {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={codeClass} {...props}>
                {children}
              </code>
            );
          },
          // Make links open in new tab
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
              {...props}
            >
              {children}
            </a>
          ),
          // Add IDs to headings for TOC linking
          h2: ({ children, ...props }) => (
            <h2 className="mt-8 mb-4 scroll-mt-20" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="mt-6 mb-3 scroll-mt-20" {...props}>
              {children}
            </h3>
          ),
          // Style tables
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th
              className="border border-border bg-muted px-4 py-2 text-left text-sm font-medium"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="border border-border px-4 py-2 text-sm"
              {...props}
            >
              {children}
            </td>
          ),
          // Style blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-primary bg-primary/5 px-4 py-2 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
