'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  createBranchProtectionRule,
  updateBranchProtectionRule,
} from '@/app/actions/branch-protection';
import type { BranchProtectionRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface BranchProtectionFormProps {
  repositoryId: string;
  branches: string[];
  existingRule?: BranchProtectionRule;
  username: string;
  repoName: string;
}

export function BranchProtectionForm({
  repositoryId,
  branches,
  existingRule,
  username,
  repoName,
}: BranchProtectionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);

    const pattern = formData.get('pattern') as string;
    const requirePullRequest = formData.get('require_pull_request') === 'on';
    const requiredApprovingReviewCount = parseInt(
      formData.get('required_approving_review_count') as string
    ) || 0;
    const requireCodeOwnerReviews = formData.get('require_code_owner_reviews') === 'on';
    const dismissStaleReviews = formData.get('dismiss_stale_reviews') === 'on';
    const requireStatusChecks = formData.get('require_status_checks') === 'on';
    const requireBranchesUpToDate = formData.get('require_branches_up_to_date') === 'on';
    const requireConversationResolution =
      formData.get('require_conversation_resolution') === 'on';
    const requireSignedCommits = formData.get('require_signed_commits') === 'on';
    const requireLinearHistory = formData.get('require_linear_history') === 'on';
    const allowForcePushes = formData.get('allow_force_pushes') === 'on';
    const allowDeletions = formData.get('allow_deletions') === 'on';
    const lockBranch = formData.get('lock_branch') === 'on';

    const data = {
      pattern,
      requirePullRequest,
      requiredApprovingReviewCount,
      requireCodeOwnerReviews,
      dismissStaleReviews,
      requireStatusChecks,
      requiredStatusChecks: [],
      requireBranchesUpToDate,
      requireConversationResolution,
      requireSignedCommits,
      requireLinearHistory,
      allowForcePushes,
      allowDeletions,
      lockBranch,
    };

    let result;
    if (existingRule) {
      result = await updateBranchProtectionRule(existingRule.id, data);
    } else {
      if (!pattern) {
        setError('Branch pattern is required');
        setLoading(false);
        return;
      }
      result = await createBranchProtectionRule(repositoryId, data);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${username}/${repoName}/settings/branches`);
    router.refresh();
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Branch pattern */}
      <div className="space-y-2">
        <Label htmlFor="pattern">Branch name pattern</Label>
        {existingRule ? (
          <Input
            id="pattern"
            name="pattern"
            value={existingRule.pattern}
            disabled
            className="font-mono"
          />
        ) : (
          <>
            <Input
              id="pattern"
              name="pattern"
              placeholder="main"
              className="font-mono"
              list="branches"
              required
            />
            <datalist id="branches">
              {branches.map((branch) => (
                <option key={branch} value={branch} />
              ))}
            </datalist>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Use * to match any characters (e.g., release-*)
        </p>
      </div>

      <Separator />

      {/* Pull request requirements */}
      <div className="space-y-4">
        <h3 className="font-medium">Protect matching branches</h3>

        <div className="space-y-4 pl-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="require_pull_request"
              name="require_pull_request"
              defaultChecked={existingRule?.require_pull_request}
            />
            <div>
              <Label htmlFor="require_pull_request" className="font-normal">
                Require a pull request before merging
              </Label>
              <p className="text-xs text-muted-foreground">
                All commits must be made to a non-protected branch and submitted via a pull request.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 ml-6">
            <div className="space-y-2">
              <Label htmlFor="required_approving_review_count" className="text-sm">
                Required approving reviews
              </Label>
              <select
                id="required_approving_review_count"
                name="required_approving_review_count"
                defaultValue={existingRule?.required_approving_review_count || 0}
                className="flex h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>
          </div>

          <div className="flex items-start gap-3 ml-6">
            <Checkbox
              id="dismiss_stale_reviews"
              name="dismiss_stale_reviews"
              defaultChecked={existingRule?.dismiss_stale_reviews}
            />
            <div>
              <Label htmlFor="dismiss_stale_reviews" className="font-normal text-sm">
                Dismiss stale pull request approvals when new commits are pushed
              </Label>
            </div>
          </div>

          <div className="flex items-start gap-3 ml-6">
            <Checkbox
              id="require_code_owner_reviews"
              name="require_code_owner_reviews"
              defaultChecked={existingRule?.require_code_owner_reviews}
            />
            <div>
              <Label htmlFor="require_code_owner_reviews" className="font-normal text-sm">
                Require review from code owners
              </Label>
            </div>
          </div>

          <div className="flex items-start gap-3 ml-6">
            <Checkbox
              id="require_conversation_resolution"
              name="require_conversation_resolution"
              defaultChecked={existingRule?.require_conversation_resolution}
            />
            <div>
              <Label htmlFor="require_conversation_resolution" className="font-normal text-sm">
                Require conversation resolution before merging
              </Label>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Status checks */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="require_status_checks"
            name="require_status_checks"
            defaultChecked={existingRule?.require_status_checks}
          />
          <div>
            <Label htmlFor="require_status_checks" className="font-normal">
              Require status checks to pass before merging
            </Label>
            <p className="text-xs text-muted-foreground">
              Choose which status checks must pass before branches can be merged.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 ml-6">
          <Checkbox
            id="require_branches_up_to_date"
            name="require_branches_up_to_date"
            defaultChecked={existingRule?.require_branches_up_to_date}
          />
          <div>
            <Label htmlFor="require_branches_up_to_date" className="font-normal text-sm">
              Require branches to be up to date before merging
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Commit requirements */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="require_signed_commits"
            name="require_signed_commits"
            defaultChecked={existingRule?.require_signed_commits}
          />
          <div>
            <Label htmlFor="require_signed_commits" className="font-normal">
              Require signed commits
            </Label>
            <p className="text-xs text-muted-foreground">
              Commits pushed to matching branches must have verified signatures.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="require_linear_history"
            name="require_linear_history"
            defaultChecked={existingRule?.require_linear_history}
          />
          <div>
            <Label htmlFor="require_linear_history" className="font-normal">
              Require linear history
            </Label>
            <p className="text-xs text-muted-foreground">
              Prevent merge commits from being pushed to matching branches.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Rules applied to everyone */}
      <div className="space-y-4">
        <h3 className="font-medium">Rules applied to everyone including administrators</h3>

        <div className="flex items-start gap-3">
          <Checkbox
            id="allow_force_pushes"
            name="allow_force_pushes"
            defaultChecked={existingRule?.allow_force_pushes}
          />
          <div>
            <Label htmlFor="allow_force_pushes" className="font-normal">
              Allow force pushes
            </Label>
            <p className="text-xs text-muted-foreground">
              Permit force pushes for all users with push access.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="allow_deletions"
            name="allow_deletions"
            defaultChecked={existingRule?.allow_deletions}
          />
          <div>
            <Label htmlFor="allow_deletions" className="font-normal">
              Allow deletions
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow users with push access to delete matching branches.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="lock_branch"
            name="lock_branch"
            defaultChecked={existingRule?.lock_branch}
          />
          <div>
            <Label htmlFor="lock_branch" className="font-normal">
              Lock branch
            </Label>
            <p className="text-xs text-muted-foreground">
              Branch is read-only. Users cannot push to the branch.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingRule ? 'Save changes' : 'Create rule'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${username}/${repoName}/settings/branches`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
