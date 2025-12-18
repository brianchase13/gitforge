import { GitRepository } from './index';
import type { GitCommit } from '@/types';

export interface FileHistoryEntry {
  commit: GitCommit;
  changeType: 'added' | 'modified' | 'deleted' | 'renamed';
  oldPath?: string; // For renames
}

export interface FileHistoryResult {
  path: string;
  ref: string;
  entries: FileHistoryEntry[];
  totalCommits: number;
}

/**
 * Get the commit history for a specific file
 * Filters commits to only those that modified the given file
 */
export async function getFileHistory(
  gitRepo: GitRepository,
  ref: string,
  path: string,
  limit: number = 100
): Promise<FileHistoryResult> {
  // Get all commits up to a reasonable depth
  const allCommits = await gitRepo.log(ref, limit * 3); // Get extra to account for filtering

  const entries: FileHistoryEntry[] = [];
  let lastFileOid: string | null = null;
  let fileExisted = false;

  for (const commit of allCommits) {
    if (entries.length >= limit) break;

    try {
      // Try to get the file at this commit
      const blob = await gitRepo.readBlob(commit.oid, path);

      if (blob) {
        // File exists at this commit
        const currentOid = hashContent(blob.content);

        if (!fileExisted) {
          // File was added in this commit (or this is first commit we're seeing it)
          entries.push({
            commit,
            changeType: 'added',
          });
          fileExisted = true;
        } else if (currentOid !== lastFileOid) {
          // File was modified
          entries.push({
            commit,
            changeType: 'modified',
          });
        }
        // If OID is same, file wasn't changed in this commit - skip

        lastFileOid = currentOid;
      } else {
        // File doesn't exist at this commit
        if (fileExisted) {
          // File was deleted in this commit
          entries.push({
            commit,
            changeType: 'deleted',
          });
          fileExisted = false;
          lastFileOid = null;
        }
      }
    } catch {
      // Error reading file at this commit
      if (fileExisted) {
        // Treat as deletion
        entries.push({
          commit,
          changeType: 'deleted',
        });
        fileExisted = false;
        lastFileOid = null;
      }
    }
  }

  // Reverse the entries so newest commits are first
  // (we built the list in chronological order but want reverse chronological)
  const reversedEntries = [...entries].reverse();

  // Adjust change types after reversal
  // In reverse chronological order:
  // - First appearance means the file currently exists
  // - Last appearance (if 'added') means file was introduced
  for (let i = 0; i < reversedEntries.length; i++) {
    const entry = reversedEntries[i];
    const nextEntry = reversedEntries[i + 1];

    // Correct the change type based on reverse chronological perspective
    if (i === 0 && entry.changeType === 'added') {
      // First entry in reverse = most recent commit
      // If file exists now, it was modified (unless it's the only commit)
      if (reversedEntries.length > 1) {
        entry.changeType = 'modified';
      }
    }
  }

  return {
    path,
    ref,
    entries: reversedEntries,
    totalCommits: reversedEntries.length,
  };
}

/**
 * Get commits that modified a file with proper change detection
 * This is a more accurate but slower implementation
 */
export async function getFileHistoryAccurate(
  gitRepo: GitRepository,
  ref: string,
  path: string,
  limit: number = 100
): Promise<FileHistoryResult> {
  const allCommits = await gitRepo.log(ref, 500);
  const entries: FileHistoryEntry[] = [];

  for (let i = 0; i < allCommits.length && entries.length < limit; i++) {
    const commit = allCommits[i];
    const parentOid = commit.parent?.[0];

    try {
      // Get file at current commit
      const currentBlob = await gitRepo.readBlob(commit.oid, path);

      if (!parentOid) {
        // Initial commit - if file exists, it was added
        if (currentBlob) {
          entries.push({
            commit,
            changeType: 'added',
          });
        }
        continue;
      }

      // Get file at parent commit
      let parentBlob = null;
      try {
        parentBlob = await gitRepo.readBlob(parentOid, path);
      } catch {
        // File didn't exist in parent
      }

      if (currentBlob && !parentBlob) {
        // File added in this commit
        entries.push({
          commit,
          changeType: 'added',
        });
      } else if (!currentBlob && parentBlob) {
        // File deleted in this commit
        entries.push({
          commit,
          changeType: 'deleted',
        });
      } else if (currentBlob && parentBlob) {
        // Both exist - check if modified
        const currentOid = hashContent(currentBlob.content);
        const parentOidHash = hashContent(parentBlob.content);

        if (currentOid !== parentOidHash) {
          entries.push({
            commit,
            changeType: 'modified',
          });
        }
      }
    } catch {
      // Skip this commit on error
      continue;
    }
  }

  return {
    path,
    ref,
    entries,
    totalCommits: entries.length,
  };
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
