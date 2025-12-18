import { notFound, redirect } from 'next/navigation';
import { getRepository } from '@/app/actions/repositories';
import { getTemplates } from '@/app/actions/templates';
import { createClient } from '@/lib/supabase/server';
import { IssueCreateForm } from '@/components/issues/IssueCreateForm';

interface NewIssuePageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function NewIssuePage({ params }: NewIssuePageProps) {
  const { username, repo: repoName } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  // Fetch issue templates for this repository
  const templates = await getTemplates(repository.id, 'issue');

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create new issue</h1>
        <p className="text-muted-foreground mt-1">
          Describe the bug or feature request in detail.
        </p>
      </div>

      <IssueCreateForm
        repositoryId={repository.id}
        username={username}
        repoName={repoName}
        templates={templates}
      />
    </div>
  );
}
