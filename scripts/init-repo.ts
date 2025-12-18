import { createClient } from '@supabase/supabase-js';
import git from 'isomorphic-git';
import { Volume } from 'memfs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'repositories';

const storagePath = process.argv[2];

if (!storagePath) {
  console.error('Usage: npx tsx scripts/init-repo.ts <storage_path>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Create in-memory volume
const vol = new Volume();
const fs = vol as any;

async function uploadToSupabase(localPath: string, remotePath: string): Promise<void> {
  const content = vol.readFileSync(localPath) as Buffer;
  const fullPath = `${storagePath}/${remotePath}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(fullPath, content, {
    upsert: true,
    contentType: 'application/octet-stream',
  });

  if (error) {
    console.error(`Failed to upload ${remotePath}:`, error.message);
  } else {
    console.log(`Uploaded: ${remotePath} (${content.length} bytes)`);
  }
}

async function uploadDirectory(localDir: string, remoteDir: string): Promise<void> {
  const entries = vol.readdirSync(localDir, { withFileTypes: true }) as any[];

  for (const entry of entries) {
    const localPath = `${localDir}/${entry.name}`;
    const remotePath = remoteDir ? `${remoteDir}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await uploadDirectory(localPath, remotePath);
    } else {
      await uploadToSupabase(localPath, remotePath);
    }
  }
}

async function main() {
  console.log(`Initializing git repo at: ${storagePath}`);

  // Initialize the repo in memory
  await git.init({
    fs,
    dir: '/',
    defaultBranch: 'main',
  });

  console.log('\nGit repository initialized in memory!');
  console.log('\nUploading to Supabase Storage...');

  // Upload the .git directory to Supabase
  await uploadDirectory('/.git', '.git');

  console.log('\nDone! Repository initialized in Supabase Storage.');
}

main().catch(console.error);
