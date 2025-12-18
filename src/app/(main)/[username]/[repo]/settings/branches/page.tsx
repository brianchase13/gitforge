import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Shield, Plus, GitBranch, Check, X, Trash2 } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getBranchProtectionRules } from '@/app/actions/branch-protection';
import { getGitRepository } from '@/lib/git';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BranchProtectionForm } from '@/components/settings/BranchProtectionForm';
import { DeleteProtectionButton } from '@/components/settings/DeleteProtectionButton';

interface BranchesSettingsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
  searchParams: Promise<{
    new?: string;
    edit?: string;
  }>;
}

export default async function BranchesSettingsPage({
  params,
  searchParams,
}: BranchesSettingsPageProps) {
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

  // Only owner can access settings
  if (!user || user.id !== repository.owner_id) {
    redirect(`/${username}/${repoName}`);
  }

  // Get protection rules
  const rules = await getBranchProtectionRules(repository.id);

  // Get branches
  let branches: string[] = [];
  try {
    const gitRepo = await getGitRepository(repository.storage_path);
    branches = await gitRepo.listBranches();
  } catch {
    // Ignore errors
  }

  const isCreating = query.new === 'true';
  const editingPattern = query.edit;
  const editingRule = editingPattern
    ? rules.find((r) => r.pattern === editingPattern)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Branch protection rules</h1>
        <p className="text-muted-foreground">
          Define rules to protect important branches and enforce workflow requirements.
        </p>
      </div>

      {/* Default branch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Default branch
          </CardTitle>
          <CardDescription>
            The default branch is considered the base branch in your repository.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1">
              {repository.default_branch}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Protection rules form */}
      {(isCreating || editingRule) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {editingRule ? 'Edit protection rule' : 'Add protection rule'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BranchProtectionForm
              repositoryId={repository.id}
              branches={branches}
              existingRule={editingRule || undefined}
              username={username}
              repoName={repoName}
            />
          </CardContent>
        </Card>
      )}

      {/* Protection rules list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protection rules
            </CardTitle>
            <CardDescription>
              {rules.length} protection {rules.length === 1 ? 'rule' : 'rules'}
            </CardDescription>
          </div>
          {!isCreating && !editingRule && (
            <Link href={`/${username}/${repoName}/settings/branches?new=true`}>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add rule
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <div className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No protection rules</h3>
              <p className="text-muted-foreground mb-4">
                Create a branch protection rule to enforce requirements on specific branches.
              </p>
              {!isCreating && (
                <Link href={`/${username}/${repoName}/settings/branches?new=true`}>
                  <Button>Add a rule</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {rule.pattern}
                      </Badge>
                      {rule.pattern === repository.default_branch && (
                        <Badge variant="outline">Default</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {rule.require_pull_request && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          Require PR
                        </span>
                      )}
                      {rule.required_approving_review_count > 0 && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          {rule.required_approving_review_count} approval(s)
                        </span>
                      )}
                      {rule.require_status_checks && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          Status checks
                        </span>
                      )}
                      {rule.require_linear_history && (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          Linear history
                        </span>
                      )}
                      {!rule.allow_force_pushes && (
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3 text-red-600" />
                          No force push
                        </span>
                      )}
                      {!rule.allow_deletions && (
                        <span className="flex items-center gap-1">
                          <X className="h-3 w-3 text-red-600" />
                          No deletion
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${username}/${repoName}/settings/branches?edit=${encodeURIComponent(rule.pattern)}`}
                    >
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                    <DeleteProtectionButton
                      ruleId={rule.id}
                      pattern={rule.pattern}
                      username={username}
                      repoName={repoName}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
