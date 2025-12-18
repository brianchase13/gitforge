import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReleaseForm } from '@/components/releases/ReleaseForm';

interface NewReleasePageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    tag?: string;
  }>;
}

export default async function NewReleasePage({
  params,
  searchParams,
}: NewReleasePageProps) {
  const { username, repo: repoName } = await params;
  const query = await searchParams;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only owner can create releases
  if (!user || user.id !== repository.owner_id) {
    redirect(`/${username}/${repoName}/releases`);
  }

  // Get branches and tags
  let branches: string[] = [];
  let tags: string[] = [];
  try {
    const gitRepo = await getGitRepository(repository.storage_path);
    branches = await gitRepo.listBranches();
    tags = await gitRepo.listTags();
  } catch {
    // Ignore errors
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/${username}/${repoName}/releases`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to releases
        </Link>
        <h1 className="text-2xl font-bold">Create a new release</h1>
        <p className="text-muted-foreground mt-1">
          Releases are deployable software iterations you can package and make available for download.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Release details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReleaseForm
            repositoryId={repository.id}
            branches={branches}
            existingTags={tags}
            defaultTag={query.tag}
            defaultBranch={repository.default_branch}
            username={username}
            repoName={repoName}
          />
        </CardContent>
      </Card>
    </div>
  );
}
