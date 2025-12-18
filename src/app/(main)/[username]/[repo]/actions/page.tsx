import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  GitBranch,
  Timer,
  AlertCircle,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

interface ActionsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function ActionsPage({ params }: ActionsPageProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  const supabase = await createClient();

  // Get workflow runs
  const { data: workflowRuns } = await supabase
    .from('workflow_runs')
    .select(`
      *,
      workflow:workflow_files(name, path)
    `)
    .eq('repository_id', repository.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get workflows
  const { data: workflows } = await supabase
    .from('workflow_files')
    .select('*')
    .eq('repository_id', repository.id);

  return (
    <div className="container py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Workflows list */}
        <aside className="w-full lg:w-64 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Workflows</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {workflows && workflows.length > 0 ? (
                <div className="divide-y">
                  {workflows.map((workflow) => (
                    <Link
                      key={workflow.id}
                      href={`/${username}/${repoName}/actions?workflow=${workflow.path}`}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-muted/50 transition-colors text-sm"
                    >
                      <Play className="h-4 w-4 text-muted-foreground" />
                      {workflow.name}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No workflows configured
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Main content - Runs list */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Workflow runs</h2>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {!workflowRuns || workflowRuns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No workflow runs yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Workflow runs will appear here when you push code or trigger workflows.
                  Configure your CI/CD by adding workflow files to your repository.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="https://docs.github.com/en/actions" target="_blank">
                    <Button variant="outline">Learn about workflows</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {workflowRuns.map((run) => (
                  <WorkflowRunRow
                    key={run.id}
                    run={run}
                    username={username}
                    repoName={repoName}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowRunRow({
  run,
  username,
  repoName,
}: {
  run: any;
  username: string;
  repoName: string;
}) {
  const getStatusIcon = () => {
    switch (run.status) {
      case 'completed':
        switch (run.conclusion) {
          case 'success':
            return <CheckCircle2 className="h-5 w-5 text-green-600" />;
          case 'failure':
            return <XCircle className="h-5 w-5 text-red-600" />;
          case 'cancelled':
            return <AlertCircle className="h-5 w-5 text-yellow-600" />;
          default:
            return <CheckCircle2 className="h-5 w-5 text-muted-foreground" />;
        }
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />;
      case 'queued':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (run.status) {
      case 'completed':
        switch (run.conclusion) {
          case 'success':
            return <Badge className="bg-green-600">Success</Badge>;
          case 'failure':
            return <Badge variant="destructive">Failed</Badge>;
          case 'cancelled':
            return <Badge variant="secondary">Cancelled</Badge>;
          default:
            return <Badge variant="secondary">{run.conclusion}</Badge>;
        }
      case 'in_progress':
        return <Badge className="bg-yellow-600">In progress</Badge>;
      case 'queued':
        return <Badge variant="outline">Queued</Badge>;
      default:
        return <Badge variant="outline">{run.status}</Badge>;
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
      {getStatusIcon()}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${username}/${repoName}/actions/runs/${run.id}`}
            className="font-medium hover:text-primary hover:underline"
          >
            {run.workflow?.name || 'Workflow'}
          </Link>
          {getStatusBadge()}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {run.head_branch}
          </span>
          <span>#{run.run_number}</span>
          <span>
            triggered {formatRelativeTime(run.created_at)}
          </span>
        </div>
      </div>
      {run.completed_at && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          {formatDuration(
            new Date(run.completed_at).getTime() -
              new Date(run.created_at).getTime()
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
