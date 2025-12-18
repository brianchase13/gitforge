import { GitRepository } from './index';
import type { GitCommit } from '@/types';

export interface BlameLine {
  lineNumber: number;
  content: string;
  commit: {
    oid: string;
    shortOid: string;
    message: string;
    author: {
      name: string;
      email: string;
      timestamp: number;
    };
  };
  isFirstLineOfCommit: boolean; // To group consecutive lines from same commit
}

export interface BlameResult {
  path: string;
  ref: string;
  lines: BlameLine[];
  commits: Map<string, GitCommit>;
}

/**
 * Get blame information for a file
 * This is a simplified blame algorithm that tracks which commit last modified each line
 */
export async function getFileBlame(
  gitRepo: GitRepository,
  ref: string,
  path: string
): Promise<BlameResult> {
  // Get the current content of the file
  const blob = await gitRepo.readBlob(ref, path);
  if (!blob) {
    throw new Error(`File ${path} not found at ref ${ref}`);
  }

  const currentContent = new TextDecoder().decode(blob.content);
  const currentLines = currentContent.split('\n');

  // Get commit history for this file
  const commits = await gitRepo.log(ref, 500); // Get enough history

  // Filter to commits that modified this file
  const relevantCommits = await filterCommitsForFile(gitRepo, commits, path);

  // Build blame by walking through history
  const blameMap = new Map<number, GitCommit>(); // lineNumber -> commit that last touched it
  const commitCache = new Map<string, GitCommit>();

  // Initialize all lines as belonging to the most recent commit
  const latestCommit = relevantCommits[0];
  if (latestCommit) {
    for (let i = 0; i < currentLines.length; i++) {
      blameMap.set(i, latestCommit);
    }
    commitCache.set(latestCommit.oid, latestCommit);
  }

  // Walk through history to find when each line was introduced
  for (let i = 0; i < relevantCommits.length - 1; i++) {
    const currentCommit = relevantCommits[i];
    const previousCommit = relevantCommits[i + 1];

    try {
      // Get file content at both commits
      const currentBlob = await gitRepo.readBlob(currentCommit.oid, path);
      const previousBlob = await gitRepo.readBlob(previousCommit.oid, path);

      if (!currentBlob || !previousBlob) continue;

      const currentFileLines = new TextDecoder().decode(currentBlob.content).split('\n');
      const previousFileLines = new TextDecoder().decode(previousBlob.content).split('\n');

      // Find lines that exist in previous but not in current (deleted lines)
      // and lines that exist in current but not in previous (added lines)
      const addedLines = findAddedLines(previousFileLines, currentFileLines);

      // Mark added lines as belonging to currentCommit
      for (const lineIdx of addedLines) {
        // Map this line index in the commit's version to current version
        const currentLineContent = currentFileLines[lineIdx];
        const currentLineIdx = currentLines.indexOf(currentLineContent);
        if (currentLineIdx !== -1 && !blameMap.has(currentLineIdx)) {
          blameMap.set(currentLineIdx, currentCommit);
        }
      }

      commitCache.set(currentCommit.oid, currentCommit);
      commitCache.set(previousCommit.oid, previousCommit);
    } catch {
      // File might not exist in older commits
      continue;
    }
  }

  // If we have a first commit that introduced the file, attribute remaining lines to it
  const firstCommit = relevantCommits[relevantCommits.length - 1];
  if (firstCommit) {
    for (let i = 0; i < currentLines.length; i++) {
      if (!blameMap.has(i)) {
        blameMap.set(i, firstCommit);
      }
    }
    commitCache.set(firstCommit.oid, firstCommit);
  }

  // Build the result
  const lines: BlameLine[] = [];
  let lastOid: string | null = null;

  for (let i = 0; i < currentLines.length; i++) {
    const commit = blameMap.get(i) || latestCommit;
    const isFirstLineOfCommit = commit?.oid !== lastOid;

    lines.push({
      lineNumber: i + 1,
      content: currentLines[i],
      commit: commit ? {
        oid: commit.oid,
        shortOid: commit.oid.slice(0, 7),
        message: commit.message.split('\n')[0], // First line only
        author: commit.author,
      } : {
        oid: 'unknown',
        shortOid: 'unknown',
        message: 'Unknown',
        author: { name: 'Unknown', email: '', timestamp: Date.now() / 1000 },
      },
      isFirstLineOfCommit,
    });

    lastOid = commit?.oid || null;
  }

  return {
    path,
    ref,
    lines,
    commits: commitCache,
  };
}

/**
 * Filter commits to only those that modified the given file
 */
async function filterCommitsForFile(
  gitRepo: GitRepository,
  commits: GitCommit[],
  path: string
): Promise<GitCommit[]> {
  const relevantCommits: GitCommit[] = [];
  let lastOid: string | null = null;

  for (const commit of commits) {
    try {
      const blob = await gitRepo.readBlob(commit.oid, path);

      // If file exists and content is different from last seen, this commit is relevant
      if (blob) {
        const currentOid = hashContent(blob.content);
        if (currentOid !== lastOid) {
          relevantCommits.push(commit);
          lastOid = currentOid;
        }
      } else if (lastOid !== null) {
        // File was deleted in this commit
        relevantCommits.push(commit);
        lastOid = null;
      }
    } catch {
      // File doesn't exist at this commit
      if (lastOid !== null) {
        relevantCommits.push(commit);
        lastOid = null;
      }
    }
  }

  return relevantCommits;
}

/**
 * Simple hash for content comparison
 */
function hashContent(content: Uint8Array): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

/**
 * Find lines that were added between two versions
 * Returns indices of lines in the 'after' array that don't exist in 'before'
 */
function findAddedLines(before: string[], after: string[]): number[] {
  const beforeSet = new Set(before);
  const addedIndices: number[] = [];

  for (let i = 0; i < after.length; i++) {
    if (!beforeSet.has(after[i])) {
      addedIndices.push(i);
    }
  }

  return addedIndices;
}
