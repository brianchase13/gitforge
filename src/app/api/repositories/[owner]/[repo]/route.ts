import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/app/actions/repositories';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  const { owner, repo } = await params;

  const repository = await getRepository(owner, repo);

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
  }

  return NextResponse.json(repository);
}
