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

  // Push always requires authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="GitForge"',
      },
    });
  }

  const authResult = await verifyAuth(authHeader, repository.id, supabase);
  if (!authResult.authorized) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const body = new Uint8Array(await request.arrayBuffer());

    const storageFS = await getRepositoryFS(repository.storage_path);
    const backend = new GitHTTPBackend(storageFS);

    const result = await backend.receivePack(body);

    // Format response
    const response = formatReceivePackResponse(result);

    // Log push event
    await logPushEvent(supabase, repository.id, authResult.userId!);

    // Update repository's updated_at
    await supabase
      .from('repositories')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', repository.id);

    return new NextResponse(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-git-receive-pack-result',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Git receive-pack error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function formatReceivePackResponse(result: { success: boolean; message: string }): string {
  if (result.success) {
    // Report OK status for each ref
    return '0000'; // Simple OK response
  } else {
    // Report error
    const errorLine = `001f\x01error: ${result.message}\n`;
    return errorLine + '0000';
  }
}

async function logPushEvent(
  supabase: any,
  repositoryId: string,
  userId: string
): Promise<void> {
  try {
    await supabase.from('events').insert({
      type: 'push',
      actor_id: userId,
      repository_id: repositoryId,
      payload: { action: 'push' },
    });
  } catch (error) {
    console.error('Failed to log push event:', error);
  }
}

async function verifyAuth(
  authHeader: string,
  repositoryId: string,
  supabase: any
): Promise<{ authorized: boolean; userId?: string }> {
  if (!authHeader.startsWith('Basic ')) {
    return { authorized: false };
  }

  const base64Credentials = authHeader.substring(6);
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, token] = credentials.split(':');

  if (!username || !token) {
    return { authorized: false };
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
    return { authorized: false };
  }

  // Check scopes - need write access
  if (!accessToken.scopes.includes('repo:write') && !accessToken.scopes.includes('repo')) {
    return { authorized: false };
  }

  // Check repository access
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id')
    .eq('id', repositoryId)
    .single();

  if (!repository) {
    return { authorized: false };
  }

  // Owner has full access
  if (repository.owner_id === accessToken.user_id) {
    return { authorized: true, userId: accessToken.user_id };
  }

  // Check collaborator access with write permission
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('permission')
    .eq('repository_id', repositoryId)
    .eq('user_id', accessToken.user_id)
    .single();

  if (collaborator && ['write', 'admin'].includes(collaborator.permission)) {
    return { authorized: true, userId: accessToken.user_id };
  }

  return { authorized: false };
}
