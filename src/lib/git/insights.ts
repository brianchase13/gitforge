import { getGitRepository } from '@/lib/git';
import type { GitCommit } from '@/types';

export interface ContributorStats {
  email: string;
  name: string;
  commits: number;
  additions: number;
  deletions: number;
  firstCommit: number;
  lastCommit: number;
}

export interface CommitActivity {
  week: number; // Unix timestamp of week start
  days: number[]; // commits per day (Sun-Sat)
  total: number;
}

export interface CodeFrequency {
  week: number;
  additions: number;
  deletions: number;
}

/**
 * Get contributor statistics from commit history
 */
export async function getContributorStats(
  storagePath: string,
  ref: string = 'HEAD',
  maxCommits: number = 1000
): Promise<ContributorStats[]> {
  const repo = await getGitRepository(storagePath);
  const commits = await repo.log(ref, maxCommits);

  const contributorMap = new Map<string, ContributorStats>();

  for (const commit of commits) {
    const key = commit.author.email.toLowerCase();

    if (!contributorMap.has(key)) {
      contributorMap.set(key, {
        email: commit.author.email,
        name: commit.author.name,
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommit: commit.author.timestamp,
        lastCommit: commit.author.timestamp,
      });
    }

    const stats = contributorMap.get(key)!;
    stats.commits++;
    stats.firstCommit = Math.min(stats.firstCommit, commit.author.timestamp);
    stats.lastCommit = Math.max(stats.lastCommit, commit.author.timestamp);
  }

  // Sort by commits descending
  return Array.from(contributorMap.values()).sort((a, b) => b.commits - a.commits);
}

/**
 * Get commit activity (commits per week/day) for the last year
 */
export async function getCommitActivity(
  storagePath: string,
  ref: string = 'HEAD'
): Promise<CommitActivity[]> {
  const repo = await getGitRepository(storagePath);
  const commits = await repo.log(ref, 5000); // Get more commits for activity

  // Calculate week boundaries for the last 52 weeks
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weeks: CommitActivity[] = [];

  for (let i = 52; i >= 0; i--) {
    const weekStart = now - i * oneWeek;
    const weekStartDate = new Date(weekStart);
    // Align to Sunday
    weekStartDate.setHours(0, 0, 0, 0);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());

    weeks.push({
      week: Math.floor(weekStartDate.getTime() / 1000),
      days: [0, 0, 0, 0, 0, 0, 0],
      total: 0,
    });
  }

  // Count commits per day
  for (const commit of commits) {
    const commitTime = commit.author.timestamp * 1000;
    const commitDate = new Date(commitTime);

    // Find which week this commit belongs to
    for (const week of weeks) {
      const weekStart = week.week * 1000;
      const weekEnd = weekStart + oneWeek;

      if (commitTime >= weekStart && commitTime < weekEnd) {
        const dayOfWeek = commitDate.getDay();
        week.days[dayOfWeek]++;
        week.total++;
        break;
      }
    }
  }

  return weeks;
}

/**
 * Get code frequency (additions/deletions per week)
 * Note: This is a simplified version - full implementation would require computing diffs
 */
export async function getCodeFrequency(
  storagePath: string,
  ref: string = 'HEAD'
): Promise<CodeFrequency[]> {
  const repo = await getGitRepository(storagePath);
  const commits = await repo.log(ref, 1000);

  // Group commits by week and estimate code changes
  // This is a simplified implementation - real implementation would diff each commit
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekMap = new Map<number, CodeFrequency>();

  for (let i = 52; i >= 0; i--) {
    const weekStart = now - i * oneWeek;
    const weekStartDate = new Date(weekStart);
    weekStartDate.setHours(0, 0, 0, 0);
    weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay());
    const weekKey = Math.floor(weekStartDate.getTime() / 1000);

    weekMap.set(weekKey, {
      week: weekKey,
      additions: 0,
      deletions: 0,
    });
  }

  // Estimate changes based on commit count (simplified)
  for (const commit of commits) {
    const commitTime = commit.author.timestamp * 1000;
    const commitDate = new Date(commitTime);
    commitDate.setHours(0, 0, 0, 0);
    commitDate.setDate(commitDate.getDate() - commitDate.getDay());
    const weekKey = Math.floor(commitDate.getTime() / 1000);

    const week = weekMap.get(weekKey);
    if (week) {
      // Estimate: average 50 lines added, 20 deleted per commit
      week.additions += 50;
      week.deletions += 20;
    }
  }

  return Array.from(weekMap.values()).sort((a, b) => a.week - b.week);
}

/**
 * Get commit statistics summary
 */
export async function getCommitSummary(
  storagePath: string,
  ref: string = 'HEAD'
): Promise<{
  totalCommits: number;
  totalContributors: number;
  commitsThisWeek: number;
  commitsThisMonth: number;
}> {
  const repo = await getGitRepository(storagePath);
  const commits = await repo.log(ref, 5000);

  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  const contributors = new Set<string>();
  let commitsThisWeek = 0;
  let commitsThisMonth = 0;

  for (const commit of commits) {
    contributors.add(commit.author.email.toLowerCase());

    const commitTime = commit.author.timestamp * 1000;
    if (now - commitTime < oneWeek) {
      commitsThisWeek++;
    }
    if (now - commitTime < oneMonth) {
      commitsThisMonth++;
    }
  }

  return {
    totalCommits: commits.length,
    totalContributors: contributors.size,
    commitsThisWeek,
    commitsThisMonth,
  };
}
