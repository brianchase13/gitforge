import git from 'isomorphic-git';
import { SupabaseStorageFS, getRepositoryFS } from '@/lib/storage';
import type { GitCommit, GitTree, GitBlob } from '@/types';

export interface GitFS {
  promises: {
    readFile: (path: string) => Promise<Uint8Array>;
    writeFile: (path: string, data: Uint8Array | string) => Promise<void>;
    unlink: (path: string) => Promise<void>;
    readdir: (path: string) => Promise<string[]>;
    mkdir: (path: string) => Promise<void>;
    rmdir: (path: string) => Promise<void>;
    stat: (path: string) => Promise<{ type: string; size: number }>;
    lstat: (path: string) => Promise<{ type: string; size: number }>;
  };
}

// Adapter to make SupabaseStorageFS compatible with isomorphic-git
// Uses the promises-only API which isomorphic-git supports
function createGitFS(storageFS: SupabaseStorageFS): any {
  // Helper to create stat result with proper methods
  const createStatResult = (stat: { type: string; size: number }) => ({
    type: stat.type === 'dir' ? 'dir' : 'file',
    size: stat.size,
    mode: stat.type === 'dir' ? 16384 : 33188, // directory or regular file
    isFile: () => stat.type === 'file',
    isDirectory: () => stat.type === 'dir',
    isSymbolicLink: () => false,
  });

  // Promise-based methods - isomorphic-git will use fs.promises if available
  return {
    promises: {
      readFile: async (path: string, options?: any) => {
        const data = await storageFS.readFile(path);
        // If encoding is specified, return string
        if (options?.encoding === 'utf8' || options === 'utf8') {
          return new TextDecoder().decode(data);
        }
        return data;
      },
      writeFile: async (path: string, data: Uint8Array | string, options?: any) => {
        await storageFS.writeFile(path, data);
      },
      unlink: async (path: string) => {
        await storageFS.unlink(path);
      },
      readdir: async (path: string, options?: any) => {
        return await storageFS.readdir(path);
      },
      mkdir: async (path: string, options?: any) => {
        await storageFS.mkdir(path);
      },
      rmdir: async (path: string, options?: any) => {
        await storageFS.rmdir(path);
      },
      stat: async (path: string, options?: any) => {
        return createStatResult(await storageFS.stat(path));
      },
      lstat: async (path: string, options?: any) => {
        return createStatResult(await storageFS.lstat(path));
      },
      // Some operations might need symlink support (even if we just reject)
      readlink: async (path: string) => {
        throw new Error('Symlinks not supported');
      },
      symlink: async (target: string, path: string) => {
        throw new Error('Symlinks not supported');
      },
    },
  };
}

export class GitRepository {
  private fs: GitFS;
  private dir: string = '/';

  constructor(storageFS: SupabaseStorageFS) {
    this.fs = createGitFS(storageFS);
  }

  // Initialize a new repository
  async init(defaultBranch: string = 'main'): Promise<void> {
    await git.init({
      fs: this.fs,
      dir: this.dir,
      defaultBranch,
    });
  }

  // Get current branch
  async getCurrentBranch(): Promise<string | undefined> {
    try {
      return await git.currentBranch({
        fs: this.fs,
        dir: this.dir,
        fullname: false,
      }) || undefined;
    } catch {
      return undefined;
    }
  }

  // List all branches
  async listBranches(): Promise<string[]> {
    try {
      return await git.listBranches({
        fs: this.fs,
        dir: this.dir,
      });
    } catch {
      return [];
    }
  }

  // List all tags
  async listTags(): Promise<string[]> {
    try {
      return await git.listTags({
        fs: this.fs,
        dir: this.dir,
      });
    } catch {
      return [];
    }
  }

  // Get commit log
  async log(ref: string = 'HEAD', depth: number = 50): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs: this.fs,
        dir: this.dir,
        ref,
        depth,
      });

      return commits.map((commit) => ({
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          timestamp: commit.commit.committer.timestamp,
        },
        parent: commit.commit.parent,
        tree: commit.commit.tree,
      }));
    } catch {
      return [];
    }
  }

  // Read a tree (directory) at a given ref/path
  async readTree(ref: string, path: string = ''): Promise<GitTree | null> {
    try {
      const commitOid = await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref,
      });

      const { tree } = await git.readTree({
        fs: this.fs,
        dir: this.dir,
        oid: commitOid,
        filepath: path || undefined,
      });

      return {
        entries: tree.map((entry) => ({
          mode: String(entry.mode),
          type: entry.type as 'blob' | 'tree' | 'commit',
          oid: entry.oid,
          path: entry.path,
        })),
      };
    } catch (e) {
      console.error('Error reading tree:', e);
      return null;
    }
  }

  // Read a blob (file) at a given ref/path
  async readBlob(ref: string, path: string): Promise<GitBlob | null> {
    try {
      const commitOid = await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref,
      });

      const { blob } = await git.readBlob({
        fs: this.fs,
        dir: this.dir,
        oid: commitOid,
        filepath: path,
      });

      return {
        content: blob,
        size: blob.length,
        encoding: 'utf-8',
      };
    } catch (e) {
      console.error('Error reading blob:', e);
      return null;
    }
  }

  // Get a single commit
  async readCommit(oid: string): Promise<GitCommit | null> {
    try {
      const commit = await git.readCommit({
        fs: this.fs,
        dir: this.dir,
        oid,
      });

      return {
        oid: commit.oid,
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          timestamp: commit.commit.author.timestamp,
        },
        committer: {
          name: commit.commit.committer.name,
          email: commit.commit.committer.email,
          timestamp: commit.commit.committer.timestamp,
        },
        parent: commit.commit.parent,
        tree: commit.commit.tree,
      };
    } catch {
      return null;
    }
  }

  // Resolve a ref to an OID
  async resolveRef(ref: string): Promise<string | null> {
    try {
      return await git.resolveRef({
        fs: this.fs,
        dir: this.dir,
        ref,
      });
    } catch {
      return null;
    }
  }

  // Check if repository is empty
  async isEmpty(): Promise<boolean> {
    const branches = await this.listBranches();
    return branches.length === 0;
  }

  // Get latest commit for a ref
  async getLatestCommit(ref: string = 'HEAD'): Promise<GitCommit | null> {
    const commits = await this.log(ref, 1);
    return commits[0] || null;
  }

  // Create an initial commit with README
  async createInitialCommit(
    repoName: string,
    description: string | null,
    author: { name: string; email: string }
  ): Promise<string> {
    // Create README content
    const readmeContent = `# ${repoName}\n\n${description || ''}\n`;

    // Write README to working directory
    await this.fs.promises.writeFile('/README.md', readmeContent);

    // Stage the file
    await git.add({
      fs: this.fs,
      dir: this.dir,
      filepath: 'README.md',
    });

    // Create commit
    const sha = await git.commit({
      fs: this.fs,
      dir: this.dir,
      message: 'Initial commit',
      author: {
        name: author.name,
        email: author.email,
      },
    });

    return sha;
  }
}

// Get a GitRepository instance for a storage path
export async function getGitRepository(storagePath: string): Promise<GitRepository> {
  const storageFS = await getRepositoryFS(storagePath);
  return new GitRepository(storageFS);
}

// Initialize a new git repository
export async function initRepository(
  storagePath: string,
  defaultBranch: string = 'main'
): Promise<GitRepository> {
  const repo = await getGitRepository(storagePath);
  await repo.init(defaultBranch);
  return repo;
}
