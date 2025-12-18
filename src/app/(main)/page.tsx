import Link from 'next/link';
import { GitBranch, GitPullRequest, CircleDot, Users, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUser } from '@/app/actions/auth';

export default async function HomePage() {
  const user = await getUser();

  if (user) {
    // Show dashboard for logged in users
    return <Dashboard user={user} />;
  }

  // Show landing page for visitors
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-8 text-center">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm">
              <span className="text-muted-foreground">Self-hosted Git hosting</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-3xl">
              Your code, your infrastructure
            </h1>
            <p className="max-w-[700px] text-muted-foreground text-lg md:text-xl">
              GitForge is a modern, self-hosted Git platform with issues, pull requests,
              CI/CD, and everything you need to manage your code.
            </p>
            <div className="flex gap-4">
              <Link href="/signup">
                <Button size="lg">Get Started</Button>
              </Link>
              <Link href="/explore">
                <Button variant="outline" size="lg">
                  Explore Repositories
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-32">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Everything you need
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete platform for hosting, reviewing, and deploying code.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={GitBranch}
              title="Git Hosting"
              description="Host unlimited public and private repositories with full Git support over HTTPS."
            />
            <FeatureCard
              icon={CircleDot}
              title="Issue Tracking"
              description="Track bugs, features, and tasks with labels, milestones, and assignees."
            />
            <FeatureCard
              icon={GitPullRequest}
              title="Pull Requests"
              description="Review code changes with inline comments, approvals, and merge controls."
            />
            <FeatureCard
              icon={Zap}
              title="CI/CD Pipelines"
              description="Automate testing and deployment with webhook-based CI/CD integration."
            />
            <FeatureCard
              icon={Users}
              title="Organizations"
              description="Collaborate with teams, manage permissions, and organize projects."
            />
            <FeatureCard
              icon={Shield}
              title="Access Control"
              description="Fine-grained permissions with support for private repositories and teams."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center space-y-6 text-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="max-w-[600px] text-muted-foreground text-lg">
              Create your account and start hosting your code in minutes.
            </p>
            <Link href="/signup">
              <Button size="lg">Create Free Account</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              <span className="font-semibold">GitForge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Open source Git hosting platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

async function Dashboard({ user }: { user: { username: string; display_name: string | null } }) {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Welcome back, {user.display_name || user.username}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your repositories
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Repositories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your repositories will appear here
            </p>
            <Link href="/new">
              <Button size="sm">
                Create Repository
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5" />
              Pull Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No open pull requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5" />
              Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No open issues assigned to you
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
