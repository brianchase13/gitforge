'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { TemplateSelector } from '@/components/TemplateSelector';
import { createIssue } from '@/app/actions/issues';
import type { Template } from '@/types';

interface IssueCreateFormProps {
  repositoryId: string;
  username: string;
  repoName: string;
  templates: Template[];
}

export function IssueCreateForm({
  repositoryId,
  username,
  repoName,
  templates,
}: IssueCreateFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  function handleTemplateSelect(template: Template) {
    setSelectedTemplate(template);
    if (template.title_template) {
      setTitle(template.title_template);
    }
    setBody(template.body);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);

    const result = await createIssue(repositoryId, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.issue) {
      router.push(`/${username}/${repoName}/issues/${result.issue.number}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              {templates.length > 0 && (
                <div className="space-y-2">
                  <Label>Template</Label>
                  <TemplateSelector
                    templates={templates}
                    onSelect={handleTemplateSelect}
                    selectedTemplate={selectedTemplate}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Issue title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Description</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe the issue in detail. You can use Markdown for formatting."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Supports Markdown formatting
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-64 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Labels</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Labels can be added after creating the issue.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Assignees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No one assigned yet.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="flex items-center justify-end gap-4 mt-6">
        <Link href={`/${username}/${repoName}/issues`}>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={loading || !title.trim()}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit new issue
        </Button>
      </div>
    </form>
  );
}
