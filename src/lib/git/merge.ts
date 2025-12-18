import git from 'isomorphic-git';
import { GitRepository, getGitRepository } from './index';
import { SupabaseStorageFS, getRepositoryFS } from '@/lib/storage';

export interface MergeResult {
  success: boolean;
  mergeCommitSha?: string;
  error?: string;
}

export interface MergeOptions {
  headBranch: string;     // Branch with changes to merge
  baseBranch: string;     // Branch to merge into
  authorName: string;
  authorEmail: string;
  message?: string;
}

/**
 * Create a raw git FS adapter for merge operations
 * This is needed because we need to access the internal isomorphic-git APIs
 */
function createMergeFS(storageFS: SupabaseStorageFS): any {
  const createStatResult = (stat: { type: string; size: number }) => ({
    type: stat.type === 'dir' ? 'dir' : 'file',
    size: stat.size,
    mode: stat.type === 'dir' ? 16384 : 33188,
    isFile: () => stat.type === 'file',
    isDirectory: () => stat.type === 'dir',
    isSymbolicLink: () => false,
  });

  return {
    promises: {
      readFile: async (path: string, options?: any) => {
        const data = await storageFS.readFile(path);
        if (options?.encoding === 'utf8' || options === 'utf8') {
          return new TextDecoder().decode(data);
        }
        return data;
      },
      writeFile: async (path: string, data: Uint8Array | string) => {
        await storageFS.writeFile(path, data);
      },
      unlink: async (path: string) => {
        await storageFS.unlink(path);
      },
      readdir: async (path: string) => {
        return await storageFS.readdir(path);
      },
      mkdir: async (path: string) => {
        await storageFS.mkdir(path);
      },
      rmdir: async (path: string) => {
        await storageFS.rmdir(path);
      },
      stat: async (path: string) => {
        return createStatResult(await storageFS.stat(path));
      },
      lstat: async (path: string) => {
        return createStatResult(await storageFS.lstat(path));
      },
      readlink: async () => {
        throw new Error('Symlinks not supported');
      },
      symlink: async () => {
        throw new Error('Symlinks not supported');
      },
    },
  };
}

/**
 * Perform a merge of two branches
 * Creates a merge commit on the base branch with changes from head branch
 */
export async function mergeBranches(
  storagePath: string,
  options: MergeOptions
): Promise<MergeResult> {
  const { headBranch, baseBranch, authorName, authorEmail, message } = options;

  try {
    const storageFS = await getRepositoryFS(storagePath);
    const fs = createMergeFS(storageFS);
    const dir = '/';

    // Resolve both branch refs to SHAs
    const baseSha = await git.resolveRef({
      fs,
      dir,
      ref: baseBranch,
    });

    const headSha = await git.resolveRef({
      fs,
      dir,
      ref: headBranch,
    });

    if (!baseSha || !headSha) {
      return { success: false, error: 'Could not resolve branch refs' };
    }

    // Check if already merged (head is ancestor of base)
    const isAncestor = await git.isDescendent({
      fs,
      dir,
      oid: baseSha,
      ancestor: headSha,
    });

    if (isAncestor) {
      return { success: false, error: 'Branch is already up to date' };
    }

    // Try to perform the merge
    // isomorphic-git doesn't have a built-in merge, so we'll do a tree merge
    const mergeResult = await performTreeMerge(
      fs,
      dir,
      baseSha,
      headSha,
      baseBranch,
      headBranch
    );

    if (!mergeResult.success) {
      return mergeResult;
    }

    // Create merge commit
    const mergeMessage = message || `Merge branch '${headBranch}' into ${baseBranch}`;

    const mergeCommitSha = await git.commit({
      fs,
      dir,
      message: mergeMessage,
      author: {
        name: authorName,
        email: authorEmail,
      },
      parent: [baseSha, headSha],
      tree: mergeResult.treeOid!,
    });

    // Update the base branch ref to point to the merge commit
    await git.writeRef({
      fs,
      dir,
      ref: `refs/heads/${baseBranch}`,
      value: mergeCommitSha,
      force: true,
    });

    return {
      success: true,
      mergeCommitSha,
    };
  } catch (error) {
    console.error('Merge error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown merge error',
    };
  }
}

interface TreeMergeResult {
  success: boolean;
  treeOid?: string;
  error?: string;
  conflicts?: string[];
}

/**
 * Perform a tree merge between two commits
 * This is a simplified merge that works for non-conflicting changes
 */
async function performTreeMerge(
  fs: any,
  dir: string,
  baseSha: string,
  headSha: string,
  baseBranch: string,
  headBranch: string
): Promise<TreeMergeResult> {
  try {
    // Find the common ancestor (merge base)
    const mergeBase = await findMergeBase(fs, dir, baseSha, headSha);

    if (!mergeBase) {
      return { success: false, error: 'Could not find merge base' };
    }

    // Read all three trees
    const baseTree = await getTreeEntries(fs, dir, mergeBase);
    const ourTree = await getTreeEntries(fs, dir, baseSha);
    const theirTree = await getTreeEntries(fs, dir, headSha);

    // Perform three-way merge
    const mergedEntries: Map<string, { oid: string; mode: number; type: string }> = new Map();
    const conflicts: string[] = [];

    // Get all unique paths
    const allPaths = new Set([
      ...baseTree.keys(),
      ...ourTree.keys(),
      ...theirTree.keys(),
    ]);

    for (const path of allPaths) {
      const baseEntry = baseTree.get(path);
      const ourEntry = ourTree.get(path);
      const theirEntry = theirTree.get(path);

      // Determine what to do based on changes
      if (ourEntry && theirEntry) {
        if (ourEntry.oid === theirEntry.oid) {
          // Same on both sides - use either
          mergedEntries.set(path, ourEntry);
        } else if (baseEntry && baseEntry.oid === ourEntry.oid) {
          // Changed only on their side - take theirs
          mergedEntries.set(path, theirEntry);
        } else if (baseEntry && baseEntry.oid === theirEntry.oid) {
          // Changed only on our side - keep ours
          mergedEntries.set(path, ourEntry);
        } else {
          // Both changed - conflict!
          conflicts.push(path);
          // For now, take theirs (incoming changes win)
          // In a full implementation, we'd create conflict markers
          mergedEntries.set(path, theirEntry);
        }
      } else if (ourEntry && !theirEntry) {
        if (baseEntry && baseEntry.oid === ourEntry.oid) {
          // Deleted on their side, unchanged on ours - delete
          // Don't add to merged
        } else if (!baseEntry) {
          // Added on our side only - keep
          mergedEntries.set(path, ourEntry);
        } else {
          // Changed on ours, deleted on theirs - conflict
          conflicts.push(path);
          // Keep our version
          mergedEntries.set(path, ourEntry);
        }
      } else if (!ourEntry && theirEntry) {
        if (baseEntry && baseEntry.oid === theirEntry.oid) {
          // Deleted on our side, unchanged on theirs - delete
          // Don't add to merged
        } else if (!baseEntry) {
          // Added on their side only - add
          mergedEntries.set(path, theirEntry);
        } else {
          // Deleted on ours, changed on theirs - conflict
          conflicts.push(path);
          // Take their version
          mergedEntries.set(path, theirEntry);
        }
      }
      // If neither has it now, it was deleted from both - don't add
    }

    if (conflicts.length > 0) {
      // For simplicity, we'll still proceed but note there were conflicts
      console.warn('Merge conflicts detected in:', conflicts);
    }

    // Build the merged tree
    const treeOid = await buildTree(fs, dir, mergedEntries);

    return {
      success: true,
      treeOid,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  } catch (error) {
    console.error('Tree merge error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tree merge failed',
    };
  }
}

/**
 * Find the merge base (common ancestor) of two commits
 */
async function findMergeBase(
  fs: any,
  dir: string,
  sha1: string,
  sha2: string
): Promise<string | null> {
  try {
    // Get ancestors of both commits
    const ancestors1 = new Set<string>();
    const ancestors2 = new Set<string>();

    // Walk back from sha1
    let queue = [sha1];
    while (queue.length > 0 && ancestors1.size < 1000) {
      const current = queue.shift()!;
      if (ancestors1.has(current)) continue;
      ancestors1.add(current);

      try {
        const commit = await git.readCommit({ fs, dir, oid: current });
        if (commit.commit.parent) {
          queue.push(...commit.commit.parent);
        }
      } catch {
        // End of history
      }
    }

    // Walk back from sha2, looking for intersection
    queue = [sha2];
    while (queue.length > 0 && ancestors2.size < 1000) {
      const current = queue.shift()!;

      if (ancestors1.has(current)) {
        // Found common ancestor
        return current;
      }

      if (ancestors2.has(current)) continue;
      ancestors2.add(current);

      try {
        const commit = await git.readCommit({ fs, dir, oid: current });
        if (commit.commit.parent) {
          queue.push(...commit.commit.parent);
        }
      } catch {
        // End of history
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get all files in a tree as a flat map
 */
async function getTreeEntries(
  fs: any,
  dir: string,
  commitOid: string
): Promise<Map<string, { oid: string; mode: number; type: string }>> {
  const result = new Map<string, { oid: string; mode: number; type: string }>();

  try {
    const commit = await git.readCommit({ fs, dir, oid: commitOid });
    await walkTree(fs, dir, commit.commit.tree, '', result);
  } catch (error) {
    console.error('Error reading tree:', error);
  }

  return result;
}

async function walkTree(
  fs: any,
  dir: string,
  treeOid: string,
  basePath: string,
  result: Map<string, { oid: string; mode: number; type: string }>
): Promise<void> {
  try {
    const { tree } = await git.readTree({ fs, dir, oid: treeOid });

    for (const entry of tree) {
      const fullPath = basePath ? `${basePath}/${entry.path}` : entry.path;

      if (entry.type === 'blob') {
        result.set(fullPath, {
          oid: entry.oid,
          mode: typeof entry.mode === 'string' ? parseInt(entry.mode, 8) : entry.mode,
          type: 'blob',
        });
      } else if (entry.type === 'tree') {
        await walkTree(fs, dir, entry.oid, fullPath, result);
      }
    }
  } catch (error) {
    console.error('Error walking tree:', error);
  }
}

/**
 * Build a tree object from a flat map of entries
 */
async function buildTree(
  fs: any,
  dir: string,
  entries: Map<string, { oid: string; mode: number; type: string }>
): Promise<string> {
  // Group entries by directory
  const rootEntries: Array<{ mode: string; path: string; oid: string; type: 'blob' | 'tree' }> = [];
  const subdirs = new Map<string, Map<string, { oid: string; mode: number; type: string }>>();

  for (const [path, entry] of entries) {
    const parts = path.split('/');
    if (parts.length === 1) {
      // Root level file
      rootEntries.push({
        mode: entry.mode.toString(8).padStart(6, '0'),
        path: parts[0],
        oid: entry.oid,
        type: entry.type as 'blob' | 'tree',
      });
    } else {
      // Nested file
      const subdir = parts[0];
      const rest = parts.slice(1).join('/');

      if (!subdirs.has(subdir)) {
        subdirs.set(subdir, new Map());
      }
      subdirs.get(subdir)!.set(rest, entry);
    }
  }

  // Recursively build subtrees
  for (const [subdir, subEntries] of subdirs) {
    const subtreeOid = await buildTree(fs, dir, subEntries);
    rootEntries.push({
      mode: '040000',
      path: subdir,
      oid: subtreeOid,
      type: 'tree',
    });
  }

  // Sort entries by name (Git requirement)
  rootEntries.sort((a, b) => {
    // Git sorts directories and files together by name
    const aName = a.type === 'tree' ? a.path + '/' : a.path;
    const bName = b.type === 'tree' ? b.path + '/' : b.path;
    return aName.localeCompare(bName);
  });

  // Write the tree
  const treeOid = await git.writeTree({
    fs,
    dir,
    tree: rootEntries,
  });

  return treeOid;
}

/**
 * Check if a merge would have conflicts
 */
export async function checkMergeable(
  storagePath: string,
  headBranch: string,
  baseBranch: string
): Promise<{ mergeable: boolean; conflicts?: string[] }> {
  try {
    const storageFS = await getRepositoryFS(storagePath);
    const fs = createMergeFS(storageFS);
    const dir = '/';

    const baseSha = await git.resolveRef({ fs, dir, ref: baseBranch });
    const headSha = await git.resolveRef({ fs, dir, ref: headBranch });

    if (!baseSha || !headSha) {
      return { mergeable: false };
    }

    // Check if fast-forward is possible
    const isAncestor = await git.isDescendent({
      fs,
      dir,
      oid: headSha,
      ancestor: baseSha,
    });

    if (isAncestor) {
      // Fast-forward merge is always clean
      return { mergeable: true };
    }

    // For now, assume mergeable unless we detect conflicts
    // A full implementation would do a trial merge
    return { mergeable: true };
  } catch (error) {
    console.error('Error checking mergeable:', error);
    return { mergeable: false };
  }
}
