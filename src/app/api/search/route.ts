import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'all'; // 'all', 'repositories', 'users', 'issues'
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');

  if (!query || query.length < 2) {
    return NextResponse.json({
      repositories: [],
      users: [],
      issues: [],
      total: 0,
    });
  }

  const offset = (page - 1) * perPage;
  const searchPattern = `%${query}%`;

  const results: {
    repositories: any[];
    users: any[];
    issues: any[];
    total: number;
  } = {
    repositories: [],
    users: [],
    issues: [],
    total: 0,
  };

  // Search repositories
  if (type === 'all' || type === 'repositories') {
    const { data: repos, count: repoCount } = await supabase
      .from('repositories')
      .select(`
        id,
        name,
        description,
        visibility,
        stars_count,
        forks_count,
        updated_at,
        owner:users!repositories_owner_id_fkey(id, username, avatar_url)
      `, { count: 'exact' })
      .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
      .eq('visibility', 'public')
      .order('stars_count', { ascending: false })
      .range(offset, offset + perPage - 1);

    results.repositories = repos || [];
    results.total += repoCount || 0;
  }

  // Search users
  if (type === 'all' || type === 'users') {
    const { data: users, count: userCount } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio', { count: 'exact' })
      .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
      .range(offset, offset + perPage - 1);

    results.users = users || [];
    results.total += userCount || 0;
  }

  // Search issues (public repos only)
  if (type === 'all' || type === 'issues') {
    const { data: issues, count: issueCount } = await supabase
      .from('issues')
      .select(`
        id,
        number,
        title,
        state,
        created_at,
        repository:repositories!inner(
          id,
          name,
          visibility,
          owner:users!repositories_owner_id_fkey(username)
        )
      `, { count: 'exact' })
      .or(`title.ilike.${searchPattern}`)
      .eq('repository.visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    results.issues = issues || [];
    results.total += issueCount || 0;
  }

  return NextResponse.json(results);
}
