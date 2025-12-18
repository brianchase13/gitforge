import Link from 'next/link';
import {
  GitBranch,
  Heart,
  Code2,
  Server,
  Users,
  Zap,
  Globe,
  Shield,
  ArrowRight,
  Github,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'About',
  description: 'Learn about GitForge - a lightweight, serverless Git hosting platform.',
};

const values = [
  {
    icon: Heart,
    title: 'Open Source First',
    description: 'We believe in transparency. GitForge is fully open source, allowing anyone to inspect, contribute, or self-host.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Built by developers, for developers. Our roadmap is shaped by the community that uses GitForge every day.',
  },
  {
    icon: Zap,
    title: 'Simplicity',
    description: 'No bloat, no complexity. We focus on the features that matter and keep everything fast and intuitive.',
  },
  {
    icon: Globe,
    title: 'Accessible to All',
    description: 'Free forever for public repositories. We believe everyone should have access to quality code hosting.',
  },
];

const techStack = [
  {
    name: 'Next.js',
    description: 'React framework for the frontend and API routes',
    href: 'https://nextjs.org',
  },
  {
    name: 'Supabase',
    description: 'PostgreSQL database, authentication, and storage',
    href: 'https://supabase.com',
  },
  {
    name: 'Vercel',
    description: 'Serverless deployment and edge network',
    href: 'https://vercel.com',
  },
  {
    name: 'isomorphic-git',
    description: 'Pure JavaScript Git implementation',
    href: 'https://isomorphic-git.org',
  },
  {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS framework',
    href: 'https://tailwindcss.com',
  },
  {
    name: 'shadcn/ui',
    description: 'Beautiful, accessible UI components',
    href: 'https://ui.shadcn.com',
  },
];

const timeline = [
  {
    year: '2024',
    title: 'The Idea',
    description: 'GitForge started as an experiment: could we build a fully functional Git hosting platform using only serverless technologies?',
  },
  {
    year: '2024',
    title: 'First Commit',
    description: 'The first lines of code were written. Repository hosting, issues, and pull requests came to life.',
  },
  {
    year: '2025',
    title: 'Public Launch',
    description: 'GitForge opened to the public. Developers started hosting their projects and contributing to the platform.',
  },
  {
    year: 'Future',
    title: 'Growing Together',
    description: 'Private repositories, team features, and CI/CD workflows are on the roadmap. The journey continues.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <GitBranch className="h-3 w-3 mr-1" />
              About GitForge
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Git hosting,
              <br />
              <span className="text-primary">reimagined.</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              GitForge is a lightweight, open-source Git hosting platform built entirely
              on serverless infrastructure. No servers to manage, no complexity to navigate.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24 border-b">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                We believe that hosting code should be simple, transparent, and accessible
                to everyone. Too many platforms have become bloated with features most
                developers never use.
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                GitForge takes a different approach. We focus on the essentials:
                repositories, issues, pull requests, and collaboration. Everything
                runs on serverless infrastructure, which means zero maintenance and
                infinite scalability.
              </p>
              <p className="text-lg text-muted-foreground">
                Most importantly, GitForge is open source. You can see exactly how
                everything works, contribute improvements, or run your own instance.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-6">
                <Server className="h-8 w-8 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold">100%</div>
                <div className="text-sm text-muted-foreground">Serverless</div>
              </Card>
              <Card className="text-center p-6">
                <Code2 className="h-8 w-8 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold">Open</div>
                <div className="text-sm text-muted-foreground">Source</div>
              </Card>
              <Card className="text-center p-6">
                <Shield className="h-8 w-8 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold">Free</div>
                <div className="text-sm text-muted-foreground">Forever</div>
              </Card>
              <Card className="text-center p-6">
                <Globe className="h-8 w-8 mx-auto mb-3 text-primary" />
                <div className="text-2xl font-bold">Global</div>
                <div className="text-sm text-muted-foreground">Edge Network</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What We Believe
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our values guide every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center">
                <CardHeader>
                  <div className="mx-auto p-3 rounded-full bg-primary/10 mb-2">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 border-b">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From idea to reality, here&apos;s how GitForge came to be.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div key={index} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {item.year === 'Future' ? '→' : item.year.slice(2)}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className="w-px h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-8">
                    <div className="text-sm text-muted-foreground mb-1">{item.year}</div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 md:py-24 border-b bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built With Modern Tech
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              GitForge is powered by best-in-class open source technologies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {techStack.map((tech) => (
              <a
                key={tech.name}
                href={tech.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {tech.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {tech.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="py-16 md:py-24 border-b">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex p-4 rounded-full bg-primary/10 mb-6">
              <Github className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Fully Open Source
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              GitForge is open source under the MIT license. Browse the code,
              report issues, submit pull requests, or fork it and run your own instance.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <a
                  href="https://github.com/brianchase13/gitforge"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/explore">Explore Projects</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to join us?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create your free account and start hosting your code today.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
