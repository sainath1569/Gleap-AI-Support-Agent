import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';


function CodeBlock({ className, children }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeString = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-2.5 rounded-xl bg-[#1e1e24] text-gray-100 overflow-hidden text-[12px] shadow-sm border border-gray-800">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#16161a] border-b border-gray-800/80 text-[11px] text-gray-400">
        <span className="font-mono uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-white/10"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono leading-relaxed scrollbar-thin">
        <code>{codeString}</code>
      </div>
    </div>
  );
}

export default function MarkdownRenderer({ content, citation }) {
  if (!content) return null;

  return (
    <div className="markdown-output text-[13.5px] sm:text-[14px] leading-relaxed text-gray-900 break-words space-y-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Table styling: responsive horizontal scroll wrapper with sleek Gleap borders
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-2.5 rounded-xl border border-gray-200/90 shadow-2xs bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-[13px] text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-100/90 text-gray-900 font-semibold uppercase text-[11px] tracking-wider">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-bold text-gray-900 border-b border-gray-200 whitespace-nowrap">
              {children}
            </th>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100 bg-white">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50/70 transition-colors">
              {children}
            </tr>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-gray-700 border-b border-gray-100 whitespace-normal leading-relaxed">
              {children}
            </td>
          ),

          // Headings: bold, clean hierarchy
          h1: ({ children }) => (
            <h1 className="text-[16px] sm:text-[17px] font-bold text-gray-950 mt-3 mb-1.5 leading-snug">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[14.5px] sm:text-[15.5px] font-bold text-gray-950 mt-2.5 mb-1 leading-snug">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[13.5px] sm:text-[14px] font-bold text-gray-900 mt-2 mb-0.5 leading-snug">
              {children}
            </h3>
          ),

          // Horizontal rule
          hr: () => (
            <hr className="my-3 border-0 h-[1px] bg-gray-200/90" />
          ),

          // Emphasis
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-950">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800">
              {children}
            </em>
          ),
          del: ({ children }) => (
            <del className="line-through text-gray-400">
              {children}
            </del>
          ),

          // Paragraph
          p: ({ children }) => (
            <p className="leading-relaxed my-1 first:mt-0 last:mb-0">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="space-y-1 my-1.5 pl-4 list-disc text-gray-800 marker:text-gray-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-1 my-1.5 pl-4 list-decimal text-gray-800 marker:text-gray-500">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">
              {children}
            </li>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-[3px] border-black pl-3 py-1 text-gray-600 italic bg-gray-50/80 rounded-r-md">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => {
            const isSafeUrl = typeof href === 'string' && (
              href.startsWith('http://') || 
              href.startsWith('https://') || 
              href.startsWith('mailto:')
            );
            const safeHref = isSafeUrl ? href : '#';
            return (
              <a
                href={safeHref}
                target={isSafeUrl ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline underline-offset-2 break-all font-medium transition-colors"
              >
                {children}
              </a>
            );
          },

          // Code blocks & inline code
          code: ({ className, children, ...props }) => {
            const isMultiLine = String(children).includes('\n');
            if (isMultiLine || className) {
              return <CodeBlock className={className}>{children}</CodeBlock>;
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-black/5 text-[#be185d] font-mono text-[12px] font-medium break-all"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      {citation && (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300/90 text-[10px] font-bold text-gray-700 ml-1.5 align-middle select-none">
          {citation}
        </span>
      )}
    </div>
  );
}
