import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getRepositoryFS } from '@/lib/storage';
import { GitHTTPBackend } from '@/lib/git/http-backend';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo: rawRepo } = await params;
  // Strip .git suffix if present
  const repo = rawRepo.replace(/\.git$/, '');
  const service = request.nextUrl.searchParams.get('service');

  if (!service || !['git-upload-pack', 'git-receive-pack'].includes(service)) {
    return new NextResponse('Invalid service', { status: 400 });
  }

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

  // For git-receive-pack (push), always require auth
  if (service === 'git-receive-pack') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="GitForge"',
        },
      });
    }

    const isAuthorized = await verifyAuth(authHeader, repository.id, supabase, true);
    if (!isAuthorized) {
      return new NextResponse('Unauthorized', { status: 403 });
    }
  }

  try {
    const storageFS = await getRepositoryFS(repository.storage_path);
    const backend = new GitHTTPBackend(storageFS);

    const refs = await backend.getInfoRefs(service as 'git-upload-pack' | 'git-receive-pack');

    return new NextResponse(refs, {
      status: 200,
      headers: {
        'Content-Type': `application/x-${service}-advertisement`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Git info/refs error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function verifyAuth(
  authHeader: string,
  repositoryId: string,
  supabase: any,
  requireWrite: boolean = false
): Promise<boolean> {
  // Parse Basic auth
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
  const { data: accessToken } = await supabase
    .from('access_tokens')
    .select('user_id, scopes')
    .eq('token_hash', hashToken(token))
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!accessToken) {
    return false;
  }

  // Check scopes
  const requiredScope = requireWrite ? 'repo:write' : 'repo:read';
  if (!accessToken.scopes.includes(requiredScope) && !accessToken.scopes.includes('repo')) {
    return false;
  }

  // Check repository access
  const { data: repository } = await supabase
    .from('repositories')
    .select('owner_id, visibility')
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
  if (requireWrite) {
    const { data: collaborator } = await supabase
      .from('repository_collaborators')
      .select('permission')
      .eq('repository_id', repositoryId)
      .eq('user_id', accessToken.user_id)
      .single();

    return collaborator && ['write', 'admin'].includes(collaborator.permission);
  }

  // For read, public repos are accessible to all
  if (repository.visibility === 'public') {
    return true;
  }

  // Check if user is collaborator
  const { data: collaborator } = await supabase
    .from('repository_collaborators')
    .select('id')
    .eq('repository_id', repositoryId)
    .eq('user_id', accessToken.user_id)
    .single();

  return !!collaborator;
}

function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
