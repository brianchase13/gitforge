import git from 'isomorphic-git';
import { GitRepository } from './index';

export interface FileDiff {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renamed files
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  patch: string; // Unified diff format
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'context' | 'add' | 'delete';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface CommitDiff {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  totalFiles: number;
}

/**
 * Get the diff for a commit compared to its parent
 */
export async function getCommitDiff(
  gitRepo: GitRepository,
  commitSha: string
): Promise<CommitDiff> {
  const commit = await gitRepo.readCommit(commitSha);
  if (!commit) {
    throw new Error(`Commit ${commitSha} not found`);
  }

  const parentSha = commit.parent?.[0];

  // Get trees for both commits
  const headTree = await getTreeMap(gitRepo, commitSha);
  const baseTree = parentSha ? await getTreeMap(gitRepo, parentSha) : new Map<string, TreeEntry>();

  // Find changed files
  const changedFiles = findChangedFiles(baseTree, headTree);

  const files: FileDiff[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const change of changedFiles) {
    const fileDiff = await computeFileDiff(
      gitRepo,
      change,
      parentSha || null,
      commitSha
    );
    files.push(fileDiff);
    totalAdditions += fileDiff.additions;
    totalDeletions += fileDiff.deletions;
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  };
}

/**
 * Compare two refs and get the diff
 */
export async function compareBranches(
  gitRepo: GitRepository,
  baseRef: string,
  headRef: string
): Promise<CommitDiff> {
  const baseSha = await gitRepo.resolveRef(baseRef);
  const headSha = await gitRepo.resolveRef(headRef);

  if (!baseSha || !headSha) {
    throw new Error('Could not resolve refs');
  }

  const baseTree = await getTreeMap(gitRepo, baseSha);
  const headTree = await getTreeMap(gitRepo, headSha);

  const changedFiles = findChangedFiles(baseTree, headTree);

  const files: FileDiff[] = [];
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const change of changedFiles) {
    const fileDiff = await computeFileDiff(gitRepo, change, baseSha, headSha);
    files.push(fileDiff);
    totalAdditions += fileDiff.additions;
    totalDeletions += fileDiff.deletions;
  }

  return {
    files,
    totalAdditions,
    totalDeletions,
    totalFiles: files.length,
  };
}

interface TreeEntry {
  path: string;
  oid: string;
  type: 'blob' | 'tree';
  mode: string;
}

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  oldOid?: string;
  newOid?: string;
}

/**
 * Get a flat map of all files in a tree
 */
async function getTreeMap(
  gitRepo: GitRepository,
  ref: string,
  basePath: string = ''
): Promise<Map<string, TreeEntry>> {
  const result = new Map<string, TreeEntry>();

  try {
    const tree = await gitRepo.readTree(ref, basePath);
    if (!tree) return result;

    for (const entry of tree.entries) {
      const fullPath = basePath ? `${basePath}/${entry.path}` : entry.path;

      if (entry.type === 'blob') {
        result.set(fullPath, {
          path: fullPath,
          oid: entry.oid,
          type: 'blob',
          mode: entry.mode,
        });
      } else if (entry.type === 'tree') {
        // Recursively get files from subdirectory
        const subTree = await getTreeMap(gitRepo, ref, fullPath);
        for (const [subPath, subEntry] of subTree) {
          result.set(subPath, subEntry);
        }
      }
    }
  } catch (error) {
    // Tree doesn't exist (e.g., for initial commit)
  }

  return result;
}

/**
 * Find files that changed between two trees
 */
function findChangedFiles(
  baseTree: Map<string, TreeEntry>,
  headTree: Map<string, TreeEntry>
): FileChange[] {
  const changes: FileChange[] = [];
  const allPaths = new Set([...baseTree.keys(), ...headTree.keys()]);

  for (const path of allPaths) {
    const baseEntry = baseTree.get(path);
    const headEntry = headTree.get(path);

    if (!baseEntry && headEntry) {
      // File added
      changes.push({
        path,
        status: 'added',
        newOid: headEntry.oid,
      });
    } else if (baseEntry && !headEntry) {
      // File deleted
      changes.push({
        path,
        status: 'deleted',
        oldOid: baseEntry.oid,
      });
    } else if (baseEntry && headEntry && baseEntry.oid !== headEntry.oid) {
      // File modified
      changes.push({
        path,
        status: 'modified',
        oldOid: baseEntry.oid,
        newOid: headEntry.oid,
      });
    }
  }

  // Sort by path for consistent ordering
  changes.sort((a, b) => a.path.localeCompare(b.path));

  return changes;
}

/**
 * Compute the diff for a single file
 */
async function computeFileDiff(
  gitRepo: GitRepository,
  change: FileChange,
  baseSha: string | null,
  headSha: string
): Promise<FileDiff> {
  let oldContent = '';
  let newContent = '';

  try {
    if (change.status !== 'added' && baseSha) {
      const blob = await gitRepo.readBlob(baseSha, change.path);
      if (blob) {
        oldContent = new TextDecoder().decode(blob.content);
      }
    }
  } catch {
    // File didn't exist in base
  }

  try {
    if (change.status !== 'deleted') {
      const blob = await gitRepo.readBlob(headSha, change.path);
      if (blob) {
        newContent = new TextDecoder().decode(blob.content);
      }
    }
  } catch {
    // File doesn't exist in head
  }

  // Generate unified diff
  const { hunks, additions, deletions, patch } = generateUnifiedDiff(
    oldContent,
    newContent,
    change.path,
    change.status
  );

  return {
    path: change.path,
    status: change.status,
    additions,
    deletions,
    hunks,
    patch,
  };
}

/**
 * Generate a unified diff between two strings
 */
function generateUnifiedDiff(
  oldContent: string,
  newContent: string,
  filePath: string,
  status: 'added' | 'modified' | 'deleted'
): { hunks: DiffHunk[]; additions: number; deletions: number; patch: string } {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  // Simple line-by-line diff using Myers algorithm approximation
  const hunks: DiffHunk[] = [];
  let additions = 0;
  let deletions = 0;

  // Build the unified diff patch
  let patch = '';
  patch += `--- a/${filePath}\n`;
  patch += `+++ b/${filePath}\n`;

  if (status === 'added') {
    // All lines are additions
    additions = newLines.length;
    const hunkLines: DiffLine[] = newLines.map((line, i) => ({
      type: 'add' as const,
      content: line,
      newLineNumber: i + 1,
    }));

    hunks.push({
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: newLines.length,
      lines: hunkLines,
    });

    patch += `@@ -0,0 +1,${newLines.length} @@\n`;
    for (const line of newLines) {
      patch += `+${line}\n`;
    }
  } else if (status === 'deleted') {
    // All lines are deletions
    deletions = oldLines.length;
    const hunkLines: DiffLine[] = oldLines.map((line, i) => ({
      type: 'delete' as const,
      content: line,
      oldLineNumber: i + 1,
    }));

    hunks.push({
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 0,
      newLines: 0,
      lines: hunkLines,
    });

    patch += `@@ -1,${oldLines.length} +0,0 @@\n`;
    for (const line of oldLines) {
      patch += `-${line}\n`;
    }
  } else {
    // Modified file - compute actual diff
    const diffResult = computeLineDiff(oldLines, newLines);

    // Group changes into hunks with context
    const contextLines = 3;
    let currentHunk: DiffHunk | null = null;
    let oldLineNum = 1;
    let newLineNum = 1;

    for (let i = 0; i < diffResult.length; i++) {
      const { type, line, oldIdx, newIdx } = diffResult[i];

      // Check if we need context before this line
      const isChange = type !== 'context';
      const needsNewHunk = !currentHunk && isChange;

      if (needsNewHunk) {
        // Start new hunk with context
        const contextStart = Math.max(0, i - contextLines);
        const contextEnd = i;

        currentHunk = {
          oldStart: oldLineNum - (i - contextStart),
          oldLines: 0,
          newStart: newLineNum - (i - contextStart),
          newLines: 0,
          lines: [],
        };

        // Add leading context
        for (let j = contextStart; j < contextEnd; j++) {
          if (diffResult[j].type === 'context') {
            currentHunk.lines.push({
              type: 'context',
              content: diffResult[j].line,
              oldLineNumber: diffResult[j].oldIdx! + 1,
              newLineNumber: diffResult[j].newIdx! + 1,
            });
            currentHunk.oldLines++;
            currentHunk.newLines++;
          }
        }

        hunks.push(currentHunk);
      }

      if (currentHunk) {
        if (type === 'delete') {
          currentHunk.lines.push({
            type: 'delete',
            content: line,
            oldLineNumber: oldIdx! + 1,
          });
          currentHunk.oldLines++;
          deletions++;
        } else if (type === 'add') {
          currentHunk.lines.push({
            type: 'add',
            content: line,
            newLineNumber: newIdx! + 1,
          });
          currentHunk.newLines++;
          additions++;
        } else {
          // Context line
          currentHunk.lines.push({
            type: 'context',
            content: line,
            oldLineNumber: oldIdx! + 1,
            newLineNumber: newIdx! + 1,
          });
          currentHunk.oldLines++;
          currentHunk.newLines++;

          // Check if we should close the hunk
          let futureChanges = false;
          for (let j = i + 1; j <= i + contextLines && j < diffResult.length; j++) {
            if (diffResult[j].type !== 'context') {
              futureChanges = true;
              break;
            }
          }

          if (!futureChanges && i < diffResult.length - 1) {
            // Close the hunk after trailing context
            currentHunk = null;
          }
        }
      }

      if (type === 'delete' || type === 'context') {
        oldLineNum++;
      }
      if (type === 'add' || type === 'context') {
        newLineNum++;
      }
    }

    // Build patch string from hunks
    for (const hunk of hunks) {
      patch += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;
      for (const line of hunk.lines) {
        if (line.type === 'add') {
          patch += `+${line.content}\n`;
        } else if (line.type === 'delete') {
          patch += `-${line.content}\n`;
        } else {
          patch += ` ${line.content}\n`;
        }
      }
    }
  }

  return { hunks, additions, deletions, patch };
}

interface DiffOp {
  type: 'context' | 'add' | 'delete';
  line: string;
  oldIdx?: number;
  newIdx?: number;
}

/**
 * Simple line diff algorithm
 */
function computeLineDiff(oldLines: string[], newLines: string[]): DiffOp[] {
  // Use a simple LCS-based approach
  const lcs = longestCommonSubsequence(oldLines, newLines);
  const result: DiffOp[] = [];

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (lcsIdx < lcs.length && oldIdx < oldLines.length && oldLines[oldIdx] === lcs[lcsIdx]) {
      if (newIdx < newLines.length && newLines[newIdx] === lcs[lcsIdx]) {
        // Context line
        result.push({
          type: 'context',
          line: oldLines[oldIdx],
          oldIdx,
          newIdx,
        });
        oldIdx++;
        newIdx++;
        lcsIdx++;
      } else if (newIdx < newLines.length) {
        // Addition
        result.push({
          type: 'add',
          line: newLines[newIdx],
          newIdx,
        });
        newIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      // Deletion
      result.push({
        type: 'delete',
        line: oldLines[oldIdx],
        oldIdx,
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      // Addition
      result.push({
        type: 'add',
        line: newLines[newIdx],
        newIdx,
      });
      newIdx++;
    }
  }

  return result;
}

/**
 * Find the longest common subsequence of two arrays
 */
function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const result: string[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}
