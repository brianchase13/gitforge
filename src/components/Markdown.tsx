'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom link handling for internal/external links
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http') || href?.startsWith('//');

            if (isExternal) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                >
                  {children}
                </a>
              );
            }

            return (
              <Link href={href || '#'} {...props}>
                {children}
              </Link>
            );
          },

          // Enhanced code blocks
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !className;

            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded-md text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },

          // Pre block styling
          pre: ({ children, ...props }) => (
            <pre
              className="bg-muted/50 border rounded-lg overflow-x-auto p-4"
              {...props}
            >
              {children}
            </pre>
          ),

          // Table styling (GFM tables)
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full divide-y divide-border" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead className="bg-muted/50" {...props}>
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-2 text-left text-sm font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-4 py-2 text-sm border-t" {...props}>
              {children}
            </td>
          ),

          // Task lists (GFM checkboxes)
          input: ({ type, checked, ...props }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled
                  className="mr-2 rounded"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },

          // List styling
          ul: ({ children, className, ...props }) => {
            // Check if this is a task list
            const isTaskList = className?.includes('contains-task-list');
            return (
              <ul
                className={cn(
                  isTaskList ? 'list-none pl-0' : 'list-disc pl-6',
                  'my-2 space-y-1'
                )}
                {...props}
              >
                {children}
              </ul>
            );
          },
          ol: ({ children, ...props }) => (
            <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, className, ...props }) => {
            const isTaskItem = className?.includes('task-list-item');
            return (
              <li
                className={cn(isTaskItem && 'flex items-start gap-2')}
                {...props}
              >
                {children}
              </li>
            );
          },

          // Headings with anchors
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 pb-2 border-b" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-6 mb-3 pb-2 border-b" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-bold mt-5 mb-2" {...props}>
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 className="text-base font-bold mt-4 mb-2" {...props}>
              {children}
            </h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 className="text-sm font-bold mt-3 mb-1" {...props}>
              {children}
            </h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 className="text-sm font-bold mt-3 mb-1 text-muted-foreground" {...props}>
              {children}
            </h6>
          ),

          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-4 border-muted-foreground/30 pl-4 italic text-muted-foreground my-4"
              {...props}
            >
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: (props) => <hr className="my-6 border-border" {...props} />,

          // Images
          img: ({ src, alt, ...props }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || ''}
              className="max-w-full h-auto rounded-lg my-4"
              loading="lazy"
              {...props}
            />
          ),

          // Paragraphs
          p: ({ children, ...props }) => (
            <p className="my-3 leading-relaxed" {...props}>
              {children}
            </p>
          ),

          // Strong and emphasis
          strong: ({ children, ...props }) => (
            <strong className="font-semibold" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic" {...props}>
              {children}
            </em>
          ),

          // Strikethrough (GFM)
          del: ({ children, ...props }) => (
            <del className="line-through text-muted-foreground" {...props}>
              {children}
            </del>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

// Lightweight markdown renderer for smaller content (comments, issue bodies)
export function MarkdownInline({ children, className }: MarkdownProps) {
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Simplified components for inline use
          a: ({ href, children, ...props }) => {
            const isExternal = href?.startsWith('http') || href?.startsWith('//');
            if (isExternal) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props}>
                  {children}
                </a>
              );
            }
            return (
              <Link href={href || '#'} className="text-primary hover:underline" {...props}>
                {children}
              </Link>
            );
          },
          code: ({ children, ...props }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono" {...props}>
              {children}
            </code>
          ),
          p: ({ children }) => <>{children}</>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
