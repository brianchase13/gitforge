'use client';

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Template } from '@/types';

interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (template: Template) => void;
  selectedTemplate?: Template | null;
}

export function TemplateSelector({
  templates,
  onSelect,
  selectedTemplate,
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  if (templates.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          {selectedTemplate ? selectedTemplate.name : 'Choose a template'}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => {
              onSelect(template);
              setOpen(false);
            }}
            className="flex flex-col items-start gap-1 py-3"
          >
            <span className="font-medium">{template.name}</span>
            {template.description && (
              <span className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
