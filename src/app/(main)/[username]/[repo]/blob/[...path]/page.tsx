import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  FileText,
  ChevronRight,
  GitBranch,
  Copy,
  Download,
  Pencil,
  History,
  Code as CodeIcon,
} from 'lucide-react';
import { getRepository } from '@/app/actions/repositories';
import { getGitRepository } from '@/lib/git';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  formatBytes,
  getLanguageFromExtension,
  isBinaryFile,
} from '@/lib/utils';
import { CodeViewer } from '@/components/repository/CodeViewer';

interface BlobPageProps {
  params: Promise<{
    username: string;
    repo: string;
    path: string[];
  }>;
}

export default async function BlobPage({ params }: BlobPageProps) {
  const { username, repo: repoName, path: pathSegments } = await params;

  const repository = await getRepository(username, repoName);

  if (!repository) {
    notFound();
  }

  // First segment is the ref (branch/tag/commit), rest is the path
  const ref = pathSegments[0] || repository.default_branch;
  const filePath = pathSegments.slice(1).join('/');

  if (!filePath) {
    // Redirect to tree view if no file path
    notFound();
  }

  const gitRepo = await getGitRepository(repository.storage_path);

  // Read the blob
  const blob = await gitRepo.readBlob(ref, filePath);

  if (!blob) {
    notFound();
  }

  const fileName = filePath.split('/').pop() || '';
  const language = getLanguageFromExtension(fileName);
  const isBinary = isBinaryFile(fileName);

  // Build breadcrumb path segments
  const pathParts = filePath.split('/');
  const breadcrumbs = pathParts.slice(0, -1).map((part, index) => ({
    name: part,
    href: `/${username}/${repoName}/tree/${ref}/${pathParts.slice(0, index + 1).join('/')}`,
  }));

  // Decode content for text files
  let content: string | null = null;
  if (!isBinary) {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    content = decoder.decode(blob.content);
  }

  const lines = content ? content.split('\n') : [];

  return (
    <div className="container py-6">
      {/* Branch selector and path */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2">
          <GitBranch className="h-4 w-4" />
          {ref}
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <Link
            href={`/${username}/${repoName}/tree/${ref}`}
            className="text-primary hover:underline font-medium"
          >
            {repoName}
          </Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link href={crumb.href} className="text-primary hover:underline">
                {crumb.name}
              </Link>
            </span>
          ))}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{fileName}</span>
        </div>
      </div>

      {/* File viewer */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4 py-3 px-4 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{fileName}</span>
            <Badge variant="secondary" className="text-xs">
              {language}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {lines.length} lines
            </span>
            <span className="text-sm text-muted-foreground">
              ({formatBytes(blob.size)})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
            <Link href={`/${username}/${repoName}/edit/${ref}/${filePath}`}>
              <Button variant="ghost" size="sm">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/${username}/${repoName}/commits/${ref}/${filePath}`}>
              <Button variant="ghost" size="sm">
                <History className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isBinary ? (
            <div className="py-12 text-center">
              <CodeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Binary file not shown. Download to view.
              </p>
              <Button variant="outline" className="mt-4 gap-2">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          ) : (
            <CodeViewer
              content={content!}
              language={language}
              filename={fileName}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
