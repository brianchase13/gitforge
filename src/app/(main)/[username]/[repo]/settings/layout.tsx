import Link from 'next/link';
import { Settings, GitBranch, Shield, Users, Webhook, Key } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    username: string;
    repo: string;
  }>;
}

export default async function SettingsLayout({
  children,
  params,
}: SettingsLayoutProps) {
  const { username, repo } = await params;

  const navItems = [
    {
      label: 'General',
      href: `/${username}/${repo}/settings`,
      icon: Settings,
      description: 'Manage repository settings',
    },
    {
      label: 'Branches',
      href: `/${username}/${repo}/settings/branches`,
      icon: GitBranch,
      description: 'Branch protection rules',
    },
  ];

  return (
    <div className="container py-6">
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar navigation */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">{children}</div>
      </div>
    </div>
  );
}
