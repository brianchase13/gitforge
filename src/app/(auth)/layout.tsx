import Link from 'next/link';
import { GitBranch } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <GitBranch className="h-8 w-8" />
        <span className="text-2xl font-bold">GitForge</span>
      </Link>
      {children}
    </div>
  );
}
