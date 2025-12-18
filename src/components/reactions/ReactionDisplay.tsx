'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleReaction } from '@/app/actions/reactions';
import { getReactionEmoji } from './ReactionPicker';
import type { ReactionSummary, ReactableType } from '@/types';

interface ReactionDisplayProps {
  reactableType: ReactableType;
  reactableId: string;
  reactions: ReactionSummary[];
  onReactionChange?: () => void;
}

export function ReactionDisplay({
  reactableType,
  reactableId,
  reactions,
  onReactionChange,
}: ReactionDisplayProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleToggle(reaction: ReactionSummary['reaction']) {
    setLoading(reaction);

    const result = await toggleReaction(reactableType, reactableId, reaction);

    if (!result.error) {
      onReactionChange?.();
    }

    setLoading(null);
  }

  if (reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {reactions.map((r) => (
        <button
          key={r.reaction}
          onClick={() => handleToggle(r.reaction)}
          disabled={loading !== null}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors',
            r.userReacted
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20'
              : 'bg-muted border-border hover:bg-accent'
          )}
          title={r.users.map((u) => u.username).join(', ')}
        >
          {loading === r.reaction ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <span>{getReactionEmoji(r.reaction)}</span>
          )}
          <span className="font-medium">{r.count}</span>
        </button>
      ))}
    </div>
  );
}
