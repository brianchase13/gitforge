'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export interface AccessToken {
  id: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string;
  created_at: string;
}

export async function createAccessToken(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const name = formData.get('name') as string;
  const scopesRaw = formData.get('scopes') as string;
  const expiresIn = formData.get('expires_in') as string; // days

  if (!name || !scopesRaw) {
    return { error: 'Name and scopes are required' };
  }

  const scopes = scopesRaw.split(',').map((s) => s.trim());

  // Generate a secure token
  const token = generateToken();
  const tokenHash = hashToken(token);

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn || '30'));

  const { data, error } = await supabase
    .from('access_tokens')
    .insert({
      user_id: user.id,
      name,
      token_hash: tokenHash,
      scopes,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return { error: 'Failed to create token' };
  }

  revalidatePath('/settings/tokens');

  // Return the plain token only once - it cannot be retrieved again
  return { token, id: data.id };
}

export async function listAccessTokens(): Promise<AccessToken[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from('access_tokens')
    .select('id, name, scopes, last_used_at, expires_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (data as AccessToken[]) || [];
}

export async function deleteAccessToken(tokenId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('access_tokens')
    .delete()
    .eq('id', tokenId)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to delete token' };
  }

  revalidatePath('/settings/tokens');
  return { success: true };
}

function generateToken(): string {
  // Generate a 32-byte random token and encode as base64url
  const buffer = crypto.randomBytes(32);
  return 'gf_' + buffer.toString('base64url');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
