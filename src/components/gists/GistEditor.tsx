'use client';

import { useState } from 'react';
import { Plus, Trash2, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface GistFileEdit {
  id?: string;
  filename: string;
  content: string;
}

interface GistEditorProps {
  files: GistFileEdit[];
  onChange: (files: GistFileEdit[]) => void;
  readOnly?: boolean;
}

export function GistEditor({ files, onChange, readOnly = false }: GistEditorProps) {
  function addFile() {
    onChange([...files, { filename: '', content: '' }]);
  }

  function removeFile(index: number) {
    if (files.length <= 1) return;
    const newFiles = [...files];
    newFiles.splice(index, 1);
    onChange(newFiles);
  }

  function updateFile(index: number, updates: Partial<GistFileEdit>) {
    const newFiles = [...files];
    newFiles[index] = { ...newFiles[index], ...updates };
    onChange(newFiles);
  }

  return (
    <div className="space-y-4">
      {files.map((file, index) => (
        <Card key={index}>
          <CardHeader className="py-3">
            <div className="flex items-center gap-3">
              <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={file.filename}
                onChange={(e) => updateFile(index, { filename: e.target.value })}
                placeholder="filename.ext"
                className="h-8 font-mono text-sm max-w-xs"
                disabled={readOnly}
              />
              {!readOnly && files.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Textarea
              value={file.content}
              onChange={(e) => updateFile(index, { content: e.target.value })}
              placeholder="Enter file content..."
              rows={12}
              className="font-mono text-sm"
              disabled={readOnly}
            />
          </CardContent>
        </Card>
      ))}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          onClick={addFile}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add another file
        </Button>
      )}
    </div>
  );
}
