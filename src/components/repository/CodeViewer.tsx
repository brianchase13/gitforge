'use client';

import { useEffect, useState, useRef } from 'react';
import { codeToHtml, bundledLanguages, type BundledLanguage } from 'shiki';

interface CodeViewerProps {
  content: string;
  language: string;
  filename: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

// Map common file extensions to shiki language IDs
const languageMap: Record<string, BundledLanguage> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  mdx: 'mdx',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  makefile: 'makefile',
  graphql: 'graphql',
  vue: 'vue',
  svelte: 'svelte',
  toml: 'toml',
  ini: 'ini',
  env: 'bash',
};

function getShikiLanguage(lang: string): BundledLanguage {
  const normalized = lang.toLowerCase();

  // Direct match in map
  if (languageMap[normalized]) {
    return languageMap[normalized];
  }

  // Check if it's a valid bundled language
  if (normalized in bundledLanguages) {
    return normalized as BundledLanguage;
  }

  // Default to plaintext
  return 'plaintext' as BundledLanguage;
}

export function CodeViewer({
  content,
  language,
  filename,
  showLineNumbers = true,
  highlightLines = [],
}: CodeViewerProps) {
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function highlight() {
      try {
        const shikiLang = getShikiLanguage(language);

        const highlighted = await codeToHtml(content, {
          lang: shikiLang,
          theme: 'github-dark',
          transformers: [
            {
              line(node, line) {
                // Add line number attribute
                node.properties['data-line'] = line;

                // Highlight specific lines
                if (highlightLines.includes(line)) {
                  this.addClassToHast(node, 'highlighted');
                }
              },
            },
          ],
        });

        setHtml(highlighted);
      } catch (error) {
        console.error('Syntax highlighting error:', error);
        // Fallback to plain text
        setHtml(
          `<pre class="shiki"><code>${escapeHtml(content)}</code></pre>`
        );
      } finally {
        setIsLoading(false);
      }
    }

    highlight();
  }, [content, language, highlightLines]);

  if (isLoading) {
    return (
      <div className="bg-[#0d1117] min-h-[200px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="code-viewer overflow-x-auto bg-[#0d1117] text-sm"
    >
      <style jsx global>{`
        .code-viewer pre {
          margin: 0;
          padding: 1rem;
          background: transparent !important;
        }

        .code-viewer code {
          display: block;
          counter-reset: line;
        }

        .code-viewer .line {
          display: inline-block;
          width: 100%;
          min-height: 1.5em;
          padding: 0 1rem;
          margin: 0 -1rem;
        }

        .code-viewer .line.highlighted {
          background: rgba(255, 255, 0, 0.1);
        }

        .code-viewer .line::before {
          content: counter(line);
          counter-increment: line;
          display: inline-block;
          width: 3rem;
          margin-right: 1rem;
          padding-right: 1rem;
          text-align: right;
          color: rgba(110, 118, 129, 0.5);
          border-right: 1px solid rgba(110, 118, 129, 0.2);
          user-select: none;
        }

        .code-viewer .line:hover {
          background: rgba(110, 118, 129, 0.1);
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
