'use client';

import { useState, useEffect, useCallback } from 'react';
import { ReactionPicker } from './ReactionPicker';
import { ReactionDisplay } from './ReactionDisplay';
import { getReactions } from '@/app/actions/reactions';
import type { ReactionSummary, ReactableType } from '@/types';

interface ReactionsProps {
  reactableType: ReactableType;
  reactableId: string;
  initialReactions?: ReactionSummary[];
  className?: string;
}

export function Reactions({
  reactableType,
  reactableId,
  initialReactions = [],
  className,
}: ReactionsProps) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(initialReactions);

  const refreshReactions = useCallback(async () => {
    const updated = await getReactions(reactableType, reactableId);
    setReactions(updated);
  }, [reactableType, reactableId]);

  // Update if initialReactions changes (e.g., from server re-render)
  useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  return (
    <div className={className}>
      <div className="flex items-center gap-2 flex-wrap">
        <ReactionDisplay
          reactableType={reactableType}
          reactableId={reactableId}
          reactions={reactions}
          onReactionChange={refreshReactions}
        />
        <ReactionPicker
          reactableType={reactableType}
          reactableId={reactableId}
          onReactionChange={refreshReactions}
        />
      </div>
    </div>
  );
}
