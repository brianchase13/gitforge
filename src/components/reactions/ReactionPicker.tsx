'use client';

import { useState } from 'react';
import { Smile, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toggleReaction } from '@/app/actions/reactions';
import type { ReactionType, ReactableType } from '@/types';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: '+1', emoji: '👍', label: 'Thumbs up' },
  { type: '-1', emoji: '👎', label: 'Thumbs down' },
  { type: 'laugh', emoji: '😄', label: 'Laugh' },
  { type: 'hooray', emoji: '🎉', label: 'Hooray' },
  { type: 'confused', emoji: '😕', label: 'Confused' },
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'rocket', emoji: '🚀', label: 'Rocket' },
  { type: 'eyes', emoji: '👀', label: 'Eyes' },
];

interface ReactionPickerProps {
  reactableType: ReactableType;
  reactableId: string;
  onReactionChange?: () => void;
}

export function ReactionPicker({
  reactableType,
  reactableId,
  onReactionChange,
}: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ReactionType | null>(null);

  async function handleReaction(reaction: ReactionType) {
    setLoading(reaction);

    const result = await toggleReaction(reactableType, reactableId, reaction);

    if (!result.error) {
      onReactionChange?.();
    }

    setLoading(null);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r.type}
              onClick={() => handleReaction(r.type)}
              disabled={loading !== null}
              className="p-1.5 rounded hover:bg-accent transition-colors disabled:opacity-50"
              title={r.label}
            >
              {loading === r.type ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="text-lg">{r.emoji}</span>
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function getReactionEmoji(type: ReactionType): string {
  return REACTIONS.find((r) => r.type === type)?.emoji || '👍';
}
