import { redirect } from 'next/navigation';

interface InsightsPageProps {
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function InsightsPage({ params }: InsightsPageProps) {
  const { username, repo } = await params;
  // Redirect to contributors by default
  redirect(`/${username}/${repo}/insights/contributors`);
}
