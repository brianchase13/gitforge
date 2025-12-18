import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getRepositoryFS } from '@/lib/storage';
import { GitHTTPBackend } from '@/lib/git/http-backend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo: rawRepo } = await params;
  // Strip .git suffix if present
  const repo = rawRepo.replace(/\.git$/, '');

  const supabase = await createServiceClient();

  // Find repository
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', owner)
    .single();

  if (!user) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { data: repository } = await supabase
    .from('repositories')
    .select('*')
    .eq('owner_id', user.id)
    .eq('name', repo)
    .single();

  if (!repository) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Check access for private repos
  if (repository.visibility === 'private') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="GitForge"',
        },
      });
    }

    const isAuthorized = await verifyAuth(authHeader, repository.id, supabase);
    if (!isAuthorized) {
      return new NextResponse('Unauthorized', { status: 403 });
    }
  }

  try {
    const body = new Uint8Array(await request.arrayBuffer());

    const storageFS = await getRepositoryFS(repository.storage_path);
    const backend = new GitHTTPBackend(storageFS);

    const pack = await backend.uploadPack(body);

    // Format response with sideband
    const response = formatUploadPackResponse(pack);

    return new Response(Buffer.from(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/x-git-upload-pack-result',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Git upload-pack error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function formatUploadPackResponse(packData: Uint8Array): Uint8Array {
  // Format response with sideband (channel 1 for pack data)
  const parts: Uint8Array[] = [];

  // NAK line (no common commits with client)
  parts.push(pktLine('NAK\n'));

  // Send pack data through sideband channel 1 in chunks
  // Max chunk size is 65520 bytes (65535 - 4 for length - 1 for channel)
  const maxChunkSize = 65516;
  let offset = 0;

  while (offset < packData.length) {
    const chunkSize = Math.min(maxChunkSize, packData.length - offset);
    const chunk = packData.slice(offset, offset + chunkSize);

    // Create sideband packet: length (4 hex) + channel (1 byte) + data
    const packetLen = chunkSize + 5; // 4 for length prefix, 1 for channel
    const lenHex = packetLen.toString(16).padStart(4, '0');
    const packet = new Uint8Array(4 + 1 + chunkSize);
    packet.set(new TextEncoder().encode(lenHex), 0);
    packet[4] = 1; // Channel 1 = pack data
    packet.set(chunk, 5);

    parts.push(packet);
    offset += chunkSize;
  }

  // Flush packet to indicate end
  parts.push(new TextEncoder().encode('0000'));

  // Combine all parts
  const totalSize = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result;
}

function pktLine(data: string): Uint8Array {
  const content = new TextEncoder().encode(data);
  const length = content.length + 4;
  const lenHex = length.toString(16).padStart(4, '0');
  const result = new Uint8Array(4 + content.length);
  result.set(new TextEncoder().encode(lenHex), 0);
  result.set(content, 4);
  return result;
}

async function verifyAuth(
  authHeader: string,
  repositoryId: string,
  supabase: any
): Promise<boolean> {
  if (!authHeader.startsWith('Basic ')) {
    return false;
  }

  const base64Credentials = authHeader.substring(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, token] = credentials.split(':');

  if (!username || !token) {
    return false;
  }

  // Check if token is a valid access token
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const { data: accessToken } = await supabase
    .from('access_tokens')
    .select('user_id, scopes')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!accessToken) {
    return false;
  }

  // Check scopes
  if (!accessToken.scopes.includes('repo:read') && !accessToken.scopes.includes('repo')) {
    return false;
  }

  // Check repository access
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id')
    .eq('id', repositoryId)
    .single();

  if (!repository) {
    return false;
  }

  // Owner has full access
  if (repository.owner_id === accessToken.user_id) {
    return true;
  }

  // Check collaborator access
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('id')
    .eq('repository_id', repositoryId)
    .eq('user_id', accessToken.user_id)
    .single();

  return !!collaborator;
}
