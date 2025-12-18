'use client';

import { useEffect, useState } from 'react';
import { Diff2HtmlUI } from 'diff2html/lib/ui/js/diff2html-ui';
import 'diff2html/bundles/css/diff2html.min.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  fileName?: string;
  additions?: number;
  deletions?: number;
  outputFormat?: 'line-by-line' | 'side-by-side';
}

export function DiffViewer({
  diff,
  fileName,
  additions = 0,
  deletions = 0,
  outputFormat = 'line-by-line',
}: DiffViewerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'line-by-line' | 'side-by-side'>(outputFormat);

  useEffect(() => {
    if (!diff || isCollapsed) return;

    const targetElement = document.getElementById(`diff-${fileName?.replace(/[^a-z0-9]/gi, '-')}`);
    if (!targetElement) return;

    try {
      const diff2htmlUi = new Diff2HtmlUI(targetElement, diff, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: viewMode,
        highlight: true,
        fileListToggle: false,
        fileListStartVisible: false,
        fileContentToggle: false,
        stickyFileHeaders: true,
      });

      diff2htmlUi.draw();
      diff2htmlUi.highlightCode();
    } catch (error) {
      console.error('Error rendering diff:', error);
    }
  }, [diff, fileName, viewMode, isCollapsed]);

  if (!diff) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No changes to display
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 hover:text-primary transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{fileName || 'Diff'}</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Plus className="h-3 w-3" />
              {additions}
            </span>
            <span className="flex items-center gap-1 text-sm text-red-600">
              <Minus className="h-3 w-3" />
              {deletions}
            </span>
            <div className="flex items-center gap-1 border rounded-md">
              <Button
                variant={viewMode === 'line-by-line' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode('line-by-line')}
              >
                Unified
              </Button>
              <Button
                variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setViewMode('side-by-side')}
              >
                Split
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-0 overflow-x-auto">
          <div
            id={`diff-${fileName?.replace(/[^a-z0-9]/gi, '-')}`}
            className="diff-viewer-container"
          />
          <style jsx global>{`
            .diff-viewer-container .d2h-wrapper {
              margin: 0;
            }
            .diff-viewer-container .d2h-file-header {
              display: none;
            }
            .diff-viewer-container .d2h-file-wrapper {
              border: none;
              margin: 0;
              border-radius: 0;
            }
            .diff-viewer-container .d2h-code-linenumber {
              width: 50px;
              background: hsl(var(--muted));
              color: hsl(var(--muted-foreground));
              border-right: 1px solid hsl(var(--border));
            }
            .diff-viewer-container .d2h-code-line {
              padding-left: 1rem;
            }
            .diff-viewer-container .d2h-ins {
              background: rgba(46, 160, 67, 0.15);
            }
            .diff-viewer-container .d2h-del {
              background: rgba(248, 81, 73, 0.15);
            }
            .diff-viewer-container .d2h-ins .d2h-code-line-ctn {
              background: rgba(46, 160, 67, 0.3);
            }
            .diff-viewer-container .d2h-del .d2h-code-line-ctn {
              background: rgba(248, 81, 73, 0.3);
            }
            .diff-viewer-container .d2h-code-side-linenumber {
              width: 40px;
            }
            .diff-viewer-container .d2h-diff-table {
              font-size: 12px;
            }
          `}</style>
        </CardContent>
      )}
    </Card>
  );
}

// Simple text diff without diff2html for SSR
export function SimpleDiffViewer({ diff }: { diff: string }) {
  const lines = diff.split('\n');

  return (
    <Card>
      <CardContent className="p-0">
        <pre className="text-xs font-mono overflow-x-auto">
          {lines.map((line, index) => {
            let bgClass = '';
            let textClass = '';

            if (line.startsWith('+') && !line.startsWith('+++')) {
              bgClass = 'bg-green-500/10';
              textClass = 'text-green-700 dark:text-green-400';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              bgClass = 'bg-red-500/10';
              textClass = 'text-red-700 dark:text-red-400';
            } else if (line.startsWith('@@')) {
              bgClass = 'bg-blue-500/10';
              textClass = 'text-blue-700 dark:text-blue-400';
            }

            return (
              <div
                key={index}
                className={`px-4 py-0.5 ${bgClass} ${textClass}`}
              >
                {line || '\u00A0'}
              </div>
            );
          })}
        </pre>
      </CardContent>
    </Card>
  );
}
