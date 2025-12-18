import { notFound } from 'next/navigation';
import { Activity, Calendar } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getCommitActivity } from '@/lib/git/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CommitsInsightPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function CommitsInsightPage({ params }: CommitsInsightPageProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  let activity: Awaited<ReturnType<typeof getCommitActivity>> = [];

  try {
    activity = await getCommitActivity(repository.storage_path, repository.default_branch);
  } catch (error) {
    console.error('Error fetching commit activity:', error);
  }

  // Calculate totals
  const totalCommits = activity.reduce((sum, week) => sum + week.total, 0);
  const maxCommitsPerWeek = Math.max(...activity.map((w) => w.total), 1);

  // Get day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Commit Activity</h1>
        <p className="text-muted-foreground">
          {totalCommits} commits in the last year
        </p>
      </div>

      {/* Activity heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Contributions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No commit activity to display
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block">
                {/* Day labels */}
                <div className="flex gap-0.5 mb-1">
                  <div className="w-8" /> {/* Spacer for day names */}
                  {activity.map((week, weekIdx) => (
                    <div key={weekIdx} className="w-3" />
                  ))}
                </div>

                {/* Heatmap grid */}
                {dayNames.map((day, dayIdx) => (
                  <div key={day} className="flex gap-0.5 items-center">
                    <div className="w-8 text-xs text-muted-foreground pr-2">
                      {dayIdx % 2 === 1 ? day : ''}
                    </div>
                    {activity.map((week, weekIdx) => {
                      const commits = week.days[dayIdx];
                      const intensity = commits > 0
                        ? Math.min(Math.ceil((commits / 5) * 4), 4)
                        : 0;

                      return (
                        <div
                          key={weekIdx}
                          className={`w-3 h-3 rounded-sm ${getHeatmapColor(intensity)}`}
                          title={`${commits} commits on ${formatWeekDate(week.week, dayIdx)}`}
                        />
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex gap-0.5">
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`w-3 h-3 rounded-sm ${getHeatmapColor(level)}`}
                      />
                    ))}
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activity.slice(-12).reverse().map((week) => {
              const date = new Date(week.week * 1000);
              const weekLabel = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const percentage = (week.total / maxCommitsPerWeek) * 100;

              return (
                <div key={week.week} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-muted-foreground">
                    Week of {weekLabel}
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-right font-mono">
                    {week.total}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getHeatmapColor(intensity: number): string {
  switch (intensity) {
    case 0:
      return 'bg-muted';
    case 1:
      return 'bg-green-200 dark:bg-green-900';
    case 2:
      return 'bg-green-400 dark:bg-green-700';
    case 3:
      return 'bg-green-600 dark:bg-green-500';
    case 4:
      return 'bg-green-800 dark:bg-green-300';
    default:
      return 'bg-muted';
  }
}

function formatWeekDate(weekTimestamp: number, dayOffset: number): string {
  const date = new Date(weekTimestamp * 1000);
  date.setDate(date.getDate() + dayOffset);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
