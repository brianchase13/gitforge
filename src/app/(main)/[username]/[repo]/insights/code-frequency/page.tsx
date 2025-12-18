import { notFound } from 'next/navigation';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getCodeFrequency } from '@/lib/git/insights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CodeFrequencyPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function CodeFrequencyPage({ params }: CodeFrequencyPageProps) {
  const { username, repo: repoName } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  let frequency: Awaited<ReturnType<typeof getCodeFrequency>> = [];

  try {
    frequency = await getCodeFrequency(repository.storage_path, repository.default_branch);
  } catch (error) {
    console.error('Error fetching code frequency:', error);
  }

  // Calculate totals
  const totalAdditions = frequency.reduce((sum, w) => sum + w.additions, 0);
  const totalDeletions = frequency.reduce((sum, w) => sum + w.deletions, 0);
  const maxValue = Math.max(
    ...frequency.map((w) => Math.max(w.additions, w.deletions)),
    1
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Code Frequency</h1>
        <p className="text-muted-foreground">
          Lines of code added and deleted over time
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                +{totalAdditions.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Lines added</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                -{totalDeletions.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">Lines deleted</div>
          </CardContent>
        </Card>
      </div>

      {/* Code frequency chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {frequency.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No code frequency data to display
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chart */}
              <div className="h-64 flex items-end gap-1">
                {frequency.slice(-52).map((week, idx) => {
                  const addHeight = (week.additions / maxValue) * 100;
                  const delHeight = (week.deletions / maxValue) * 100;

                  return (
                    <div
                      key={week.week}
                      className="flex-1 flex flex-col items-center gap-0.5"
                      title={`Week of ${formatDate(week.week)}: +${week.additions} -${week.deletions}`}
                    >
                      <div
                        className="w-full bg-green-500 rounded-t-sm transition-all hover:bg-green-400"
                        style={{ height: `${addHeight}%`, minHeight: week.additions > 0 ? '2px' : '0' }}
                      />
                      <div
                        className="w-full bg-red-500 rounded-b-sm transition-all hover:bg-red-400"
                        style={{ height: `${delHeight}%`, minHeight: week.deletions > 0 ? '2px' : '0' }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-muted-foreground">Additions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-muted-foreground">Deletions</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent weeks table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Weeks</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Week</th>
                  <th className="text-right p-4 font-medium text-green-600">Additions</th>
                  <th className="text-right p-4 font-medium text-red-600">Deletions</th>
                  <th className="text-right p-4 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {frequency.slice(-12).reverse().map((week) => {
                  const net = week.additions - week.deletions;
                  return (
                    <tr key={week.week} className="border-b hover:bg-muted/30">
                      <td className="p-4 text-muted-foreground">
                        {formatDate(week.week)}
                      </td>
                      <td className="p-4 text-right text-green-600 font-mono">
                        +{week.additions.toLocaleString()}
                      </td>
                      <td className="p-4 text-right text-red-600 font-mono">
                        -{week.deletions.toLocaleString()}
                      </td>
                      <td
                        className={`p-4 text-right font-mono ${
                          net >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {net >= 0 ? '+' : ''}{net.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
