'use client';

import { useEffect, useState } from 'react';

interface TerminalLine {
  type: 'command' | 'output';
  text: string;
}

const terminalLines: TerminalLine[] = [
  { type: 'command', text: '$ git clone https://gitforge.dev/acme/webapp.git' },
  { type: 'output', text: "Cloning into 'webapp'..." },
  { type: 'output', text: 'remote: Counting objects: 142, done.' },
  { type: 'output', text: 'Receiving objects: 100% (142/142), done.' },
  { type: 'command', text: '$ cd webapp && git checkout -b feature/auth' },
  { type: 'output', text: "Switched to a new branch 'feature/auth'" },
  { type: 'command', text: '$ git commit -m "Add OAuth integration"' },
  { type: 'output', text: '[feature/auth 3f7a2b1] Add OAuth integration' },
  { type: 'output', text: ' 3 files changed, 127 insertions(+)' },
  { type: 'command', text: '$ git push origin feature/auth' },
  { type: 'output', text: 'Everything up-to-date' },
];

export function TerminalDemo() {
  const [displayedLines, setDisplayedLines] = useState<TerminalLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentLineIndex >= terminalLines.length) {
      // Reset after a pause
      const timeout = setTimeout(() => {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsTyping(true);
      }, 3000);
      return () => clearTimeout(timeout);
    }

    const currentLine = terminalLines[currentLineIndex];

    if (currentLine.type === 'command') {
      // Type out commands character by character
      if (currentCharIndex < currentLine.text.length) {
        const timeout = setTimeout(() => {
          setDisplayedLines(prev => {
            const newLines = [...prev];
            if (newLines.length === currentLineIndex) {
              newLines.push({ ...currentLine, text: currentLine.text.slice(0, currentCharIndex + 1) });
            } else {
              newLines[currentLineIndex] = { ...currentLine, text: currentLine.text.slice(0, currentCharIndex + 1) };
            }
            return newLines;
          });
          setCurrentCharIndex(prev => prev + 1);
        }, 30);
        return () => clearTimeout(timeout);
      } else {
        // Command finished typing, move to next line
        const timeout = setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }, 300);
        return () => clearTimeout(timeout);
      }
    } else {
      // Output lines appear instantly
      const timeout = setTimeout(() => {
        setDisplayedLines(prev => [...prev, currentLine]);
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, currentCharIndex]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-lg border bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Terminal header */}
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-zinc-400 text-sm ml-2 font-mono">terminal</span>
        </div>

        {/* Terminal content */}
        <div className="p-4 font-mono text-sm min-h-[280px]">
          {displayedLines.map((line, index) => (
            <div
              key={index}
              className={`${
                line.type === 'command'
                  ? 'text-green-400'
                  : 'text-zinc-400'
              } leading-relaxed`}
            >
              {line.text}
              {/* Show cursor at end of currently typing line */}
              {index === displayedLines.length - 1 &&
               line.type === 'command' &&
               currentLineIndex === index && (
                <span className="inline-block w-2 h-4 bg-green-400 ml-0.5 animate-pulse" />
              )}
            </div>
          ))}
          {/* Show cursor when waiting for next command */}
          {displayedLines.length > 0 &&
           currentLineIndex > displayedLines.length - 1 &&
           currentLineIndex < terminalLines.length &&
           terminalLines[currentLineIndex]?.type === 'command' && (
            <div className="text-green-400">
              <span className="inline-block w-2 h-4 bg-green-400 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
