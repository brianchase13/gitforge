import { createServiceClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'repositories';

export interface StorageFile {
  path: string;
  content: Buffer | Uint8Array;
}

export class SupabaseStorageFS {
  private supabase: Awaited<ReturnType<typeof createServiceClient>>;
  private basePath: string;

  constructor(supabase: Awaited<ReturnType<typeof createServiceClient>>, basePath: string) {
    this.supabase = supabase;
    this.basePath = basePath;
  }

  private getFullPath(path: string): string {
    // Normalize path
    const normalized = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return `${this.basePath}/${normalized}`;
  }

  async readFile(path: string): Promise<Uint8Array> {
    const fullPath = this.getFullPath(path);

    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .download(fullPath);

    if (error) {
      throw new Error(`ENOENT: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async writeFile(path: string, data: Uint8Array | string): Promise<void> {
    const fullPath = this.getFullPath(path);
    const content = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Upload with upsert
    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .upload(fullPath, content, {
        upsert: true,
        contentType: 'application/octet-stream',
      });

    if (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  async unlink(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);

    const { error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .remove([fullPath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async readdir(path: string): Promise<string[]> {
    const fullPath = this.getFullPath(path);

    const { data, error } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(fullPath);

    if (error) {
      // Return empty array if directory doesn't exist
      return [];
    }

    return data.map((item) => item.name);
  }

  async mkdir(path: string): Promise<void> {
    // Supabase Storage doesn't need explicit directory creation
    // Directories are created implicitly when files are uploaded
  }

  async rmdir(path: string): Promise<void> {
    const fullPath = this.getFullPath(path);

    // List all files in directory
    const { data } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(fullPath);

    if (data && data.length > 0) {
      const paths = data.map((item) => `${fullPath}/${item.name}`);
      await this.supabase.storage.from(BUCKET_NAME).remove(paths);
    }
  }

  async stat(path: string): Promise<{ type: 'file' | 'dir'; size: number }> {
    const fullPath = this.getFullPath(path);

    // Try to download to check if it's a file
    const { data: fileData, error: fileError } = await this.supabase.storage
      .from(BUCKET_NAME)
      .download(fullPath);

    if (!fileError && fileData) {
      return { type: 'file', size: fileData.size };
    }

    // Check if it's a directory
    const { data: dirData } = await this.supabase.storage
      .from(BUCKET_NAME)
      .list(fullPath);

    if (dirData && dirData.length > 0) {
      return { type: 'dir', size: 0 };
    }

    throw new Error(`ENOENT: ${path}`);
  }

  async lstat(path: string): Promise<{ type: 'file' | 'dir'; size: number }> {
    return this.stat(path);
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch {
      return false;
    }
  }
}

// Create storage bucket if it doesn't exist
export async function ensureStorageBucket(): Promise<void> {
  const supabase = await createServiceClient();

  const { data: buckets } = await supabase.storage.listBuckets();

  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 100 * 1024 * 1024, // 100MB max file size
    });
  }
}

// Get storage FS instance for a repository
export async function getRepositoryFS(storagePath: string): Promise<SupabaseStorageFS> {
  const supabase = await createServiceClient();
  return new SupabaseStorageFS(supabase, storagePath);
}

// Copy all files from one repository to another (for forking)
export async function copyRepositoryStorage(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const supabase = await createServiceClient();

  // Recursively list and copy all files
  await copyDirectory(supabase, sourcePath, destPath, '');
}

async function copyDirectory(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
  sourcePath: string,
  destPath: string,
  relativePath: string
): Promise<void> {
  const currentSourcePath = relativePath ? `${sourcePath}/${relativePath}` : sourcePath;

  const { data: items, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(currentSourcePath);

  if (error || !items) {
    console.error('Error listing directory:', error);
    return;
  }

  for (const item of items) {
    const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder (Supabase returns null id for folders)
      await copyDirectory(supabase, sourcePath, destPath, itemRelativePath);
    } else {
      // It's a file - copy it
      const sourceFilePath = `${sourcePath}/${itemRelativePath}`;
      const destFilePath = `${destPath}/${itemRelativePath}`;

      // Download from source
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(sourceFilePath);

      if (downloadError) {
        console.error(`Error downloading ${sourceFilePath}:`, downloadError);
        continue;
      }

      // Upload to destination
      const arrayBuffer = await fileData.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(destFilePath, new Uint8Array(arrayBuffer), {
          upsert: true,
          contentType: 'application/octet-stream',
        });

      if (uploadError) {
        console.error(`Error uploading ${destFilePath}:`, uploadError);
      }
    }
  }
}
