import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export interface WebhookPayload {
  action: string;
  repository: {
    id: string;
    name: string;
    full_name: string;
    owner: {
      id: string;
      username: string;
    };
  };
  sender: {
    id: string;
    username: string;
  };
  ref?: string;
  before?: string;
  after?: string;
  commits?: Array<{
    id: string;
    message: string;
    author: { name: string; email: string };
    timestamp: string;
  }>;
  pull_request?: {
    id: string;
    number: number;
    title: string;
    state: string;
    head_branch: string;
    base_branch: string;
  };
  issue?: {
    id: string;
    number: number;
    title: string;
    state: string;
  };
}

export type WebhookEvent =
  | 'push'
  | 'pull_request'
  | 'pull_request_review'
  | 'issue_comment'
  | 'issues'
  | 'create'
  | 'delete';

export async function triggerWebhooks(
  repositoryId: string,
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const supabase = await createServiceClient();

  // Get active webhooks for this repository that listen to this event
  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('repository_id', repositoryId)
    .eq('active', true)
    .contains('events', [event]);

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  // Deliver webhooks in parallel
  const deliveryPromises = webhooks.map((webhook) =>
    deliverWebhook(webhook, event, payload)
  );

  await Promise.allSettled(deliveryPromises);
}

async function deliverWebhook(
  webhook: {
    id: string;
    url: string;
    secret: string | null;
    content_type: string;
  },
  event: WebhookEvent,
  payload: WebhookPayload
): Promise<void> {
  const supabase = await createServiceClient();

  const payloadString = JSON.stringify(payload);
  const deliveryId = crypto.randomUUID();

  // Calculate signature
  let signature = '';
  if (webhook.secret) {
    const hmac = crypto.createHmac('sha256', webhook.secret);
    hmac.update(payloadString);
    signature = `sha256=${hmac.digest('hex')}`;
  }

  const headers: Record<string, string> = {
    'Content-Type':
      webhook.content_type === 'form' ? 'application/x-www-form-urlencoded' : 'application/json',
    'X-GitForge-Event': event,
    'X-GitForge-Delivery': deliveryId,
    'X-GitForge-Hook-ID': webhook.id,
    'User-Agent': 'GitForge-Webhook/1.0',
  };

  if (signature) {
    headers['X-Hub-Signature-256'] = signature;
  }

  const body =
    webhook.content_type === 'form'
      ? `payload=${encodeURIComponent(payloadString)}`
      : payloadString;

  let status = 0;
  let responseBody = '';
  let error: string | null = null;

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    status = response.status;
    responseBody = await response.text();

    if (!response.ok) {
      error = `HTTP ${status}: ${responseBody.slice(0, 500)}`;
    }
  } catch (e) {
    error = (e as Error).message;
  }

  // Log delivery
  await supabase.from('webhook_deliveries').insert({
    id: deliveryId,
    webhook_id: webhook.id,
    event,
    payload,
    request_headers: headers,
    response_status: status,
    response_body: responseBody.slice(0, 10000), // Limit stored response
    success: !error,
    error,
  });

  // Update webhook's last delivery info
  await supabase
    .from('webhooks')
    .update({
      last_delivery_at: new Date().toISOString(),
      last_response_status: status,
    })
    .eq('id', webhook.id);
}

export async function createWebhook(
  repositoryId: string,
  data: {
    url: string;
    secret?: string;
    events: WebhookEvent[];
    contentType?: 'json' | 'form';
  }
) {
  const supabase = await createServiceClient();

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .insert({
      repository_id: repositoryId,
      url: data.url,
      secret: data.secret || null,
      events: data.events,
      content_type: data.contentType || 'json',
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create webhook: ${error.message}`);
  }

  return webhook;
}

export async function updateWebhook(
  webhookId: string,
  data: Partial<{
    url: string;
    secret: string;
    events: WebhookEvent[];
    active: boolean;
    contentType: 'json' | 'form';
  }>
) {
  const supabase = await createServiceClient();

  const updates: Record<string, any> = {};
  if (data.url !== undefined) updates.url = data.url;
  if (data.secret !== undefined) updates.secret = data.secret;
  if (data.events !== undefined) updates.events = data.events;
  if (data.active !== undefined) updates.active = data.active;
  if (data.contentType !== undefined) updates.content_type = data.contentType;

  const { error } = await supabase
    .from('webhooks')
    .update(updates)
    .eq('id', webhookId);

  if (error) {
    throw new Error(`Failed to update webhook: ${error.message}`);
  }
}

export async function deleteWebhook(webhookId: string) {
  const supabase = await createServiceClient();

  const { error } = await supabase.from('webhooks').delete().eq('id', webhookId);

  if (error) {
    throw new Error(`Failed to delete webhook: ${error.message}`);
  }
}

export async function getWebhookDeliveries(webhookId: string, limit = 20) {
  const supabase = await createServiceClient();

  const { data } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('created_at', { ascending: false })
    .limit(limit);

  return data || [];
}
