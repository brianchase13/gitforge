import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

// CI status webhook handler
// This endpoint receives status updates from external CI providers (GitHub Actions, etc.)
export async function POST(request: NextRequest) {
  const supabase = await createServiceClient();

  try {
    const body = await request.json();

    // Verify webhook signature if configured
    const signature = request.headers.get('x-webhook-signature');
    const webhookSecret = process.env.WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const {
      repository_id,
      commit_sha,
      state, // 'pending' | 'success' | 'failure' | 'error' | 'cancelled'
      context, // CI provider name
      description,
      target_url,
      workflow_run_id,
    } = body;

    if (!repository_id || !commit_sha || !state) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate state
    const validStates = ['pending', 'success', 'failure', 'error', 'cancelled'];
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: 'Invalid state' },
        { status: 400 }
      );
    }

    // Update or create commit status
    const { data: existingStatus } = await supabase
      .from('commit_statuses')
      .select('id')
      .eq('repository_id', repository_id)
      .eq('commit_sha', commit_sha)
      .eq('context', context || 'default')
      .single();

    if (existingStatus) {
      await supabase
        .from('commit_statuses')
        .update({
          state,
          description,
          target_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStatus.id);
    } else {
      await supabase.from('commit_statuses').insert({
        repository_id,
        commit_sha,
        state,
        context: context || 'default',
        description,
        target_url,
      });
    }

    // If this is associated with a workflow run, update it too
    if (workflow_run_id) {
      await supabase
        .from('workflow_runs')
        .update({
          status: mapStateToWorkflowStatus(state),
          conclusion: mapStateToConclusion(state),
          updated_at: new Date().toISOString(),
          ...(state !== 'pending' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', workflow_run_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('CI webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function mapStateToWorkflowStatus(state: string): string {
  switch (state) {
    case 'pending':
      return 'in_progress';
    case 'success':
    case 'failure':
    case 'error':
    case 'cancelled':
      return 'completed';
    default:
      return 'queued';
  }
}

function mapStateToConclusion(state: string): string | null {
  switch (state) {
    case 'success':
      return 'success';
    case 'failure':
      return 'failure';
    case 'error':
      return 'failure';
    case 'cancelled':
      return 'cancelled';
    default:
      return null;
  }
}
