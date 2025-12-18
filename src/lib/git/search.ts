import git from 'isomorphic-git';
import { getRepositoryFS } from '@/lib/storage';

export interface SearchResult {
  path: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResults {
  results: SearchResult[];
  totalMatches: number;
  filesSearched: number;
  truncated: boolean;
}

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.webm',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.lock', '.min.js', '.min.css',
]);

// Max file size to search (1MB)
const MAX_FILE_SIZE = 1024 * 1024;

// Max results to return
const MAX_RESULTS = 100;

function isBinaryFile(path: string): boolean {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search through repository files for a query string
 */
export async function searchRepository(
  storagePath: string,
  ref: string,
  query: string,
  options: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    path?: string; // Filter by path pattern
  } = {}
): Promise<SearchResults> {
  const storageFS = await getRepositoryFS(storagePath);

  // Create the git fs adapter (cast to any since we only need read operations)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fs: any = {
    promises: {
      readFile: async (path: string, opts?: any) => {
        const data = await storageFS.readFile(path);
        if (opts?.encoding === 'utf8' || opts === 'utf8') {
          return new TextDecoder().decode(data);
        }
        return data;
      },
      readdir: async (path: string) => storageFS.readdir(path),
      stat: async (path: string) => {
        const stat = await storageFS.stat(path);
        return {
          ...stat,
          isFile: () => stat.type === 'file',
          isDirectory: () => stat.type === 'dir',
          isSymbolicLink: () => false,
        };
      },
      lstat: async (path: string) => {
        const stat = await storageFS.lstat(path);
        return {
          ...stat,
          isFile: () => stat.type === 'file',
          isDirectory: () => stat.type === 'dir',
          isSymbolicLink: () => false,
        };
      },
    },
  };

  const results: SearchResult[] = [];
  let filesSearched = 0;
  let truncated = false;

  // Build the regex
  let pattern: RegExp;
  if (options.regex) {
    pattern = new RegExp(query, options.caseSensitive ? 'g' : 'gi');
  } else {
    let escapedQuery = escapeRegex(query);
    if (options.wholeWord) {
      escapedQuery = `\\b${escapedQuery}\\b`;
    }
    pattern = new RegExp(escapedQuery, options.caseSensitive ? 'g' : 'gi');
  }

  // Get the tree for the ref
  try {
    const commitOid = await git.resolveRef({
      fs,
      dir: '/',
      ref,
    });

    // Walk all files in the tree
    await walkTree(fs, commitOid, '', async (filePath, oid) => {
      if (results.length >= MAX_RESULTS) {
        truncated = true;
        return false; // Stop walking
      }

      // Skip binary files
      if (isBinaryFile(filePath)) {
        return true;
      }

      // Filter by path if specified
      if (options.path && !filePath.toLowerCase().includes(options.path.toLowerCase())) {
        return true;
      }

      filesSearched++;

      try {
        // Read the blob
        const { blob } = await git.readBlob({
          fs,
          dir: '/',
          oid,
        });

        // Skip large files
        if (blob.length > MAX_FILE_SIZE) {
          return true;
        }

        // Decode content
        const content = new TextDecoder('utf-8', { fatal: false }).decode(blob);

        // Skip if it looks like binary
        if (content.includes('\0')) {
          return true;
        }

        // Search each line
        const lines = content.split('\n');
        for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
          const line = lines[i];
          pattern.lastIndex = 0; // Reset regex

          const match = pattern.exec(line);
          if (match) {
            results.push({
              path: filePath,
              lineNumber: i + 1,
              lineContent: line.length > 500 ? line.substring(0, 500) + '...' : line,
              matchStart: match.index,
              matchEnd: match.index + match[0].length,
            });
          }
        }
      } catch {
        // Skip files that can't be read
      }

      return true;
    });
  } catch (error) {
    console.error('Error searching repository:', error);
  }

  return {
    results,
    totalMatches: results.length,
    filesSearched,
    truncated,
  };
}

async function walkTree(
  fs: any,
  treeOid: string,
  basePath: string,
  callback: (path: string, oid: string) => Promise<boolean>
): Promise<boolean> {
  try {
    const { tree } = await git.readTree({
      fs,
      dir: '/',
      oid: treeOid,
    });

    for (const entry of tree) {
      const fullPath = basePath ? `${basePath}/${entry.path}` : entry.path;

      if (entry.type === 'blob') {
        const shouldContinue = await callback(fullPath, entry.oid);
        if (!shouldContinue) return false;
      } else if (entry.type === 'tree') {
        const shouldContinue = await walkTree(fs, entry.oid, fullPath, callback);
        if (!shouldContinue) return false;
      }
    }
  } catch (error) {
    console.error('Error walking tree:', error);
  }

  return true;
}
