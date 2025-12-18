import Link from 'next/link';
import { Check, X, Zap, Users, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing. Free for everyone.',
};

const plans = [
  {
    name: 'Free',
    description: 'Perfect for individuals and open source projects',
    price: '$0',
    period: 'forever',
    icon: Zap,
    popular: true,
    features: [
      { name: 'Unlimited public repositories', included: true },
      { name: 'Unlimited collaborators', included: true },
      { name: 'Issues & pull requests', included: true },
      { name: 'Wiki & documentation', included: true },
      { name: 'Gists & code snippets', included: true },
      { name: 'Basic CI/CD webhooks', included: true },
      { name: 'Community support', included: true },
      { name: 'Private repositories', included: false },
      { name: 'Advanced analytics', included: false },
    ],
    cta: 'Get Started',
    ctaHref: '/signup',
    ctaVariant: 'default' as const,
  },
  {
    name: 'Team',
    description: 'For teams that need private repos and collaboration',
    price: '$9',
    period: 'per user/month',
    icon: Users,
    popular: false,
    comingSoon: true,
    features: [
      { name: 'Everything in Free', included: true },
      { name: 'Unlimited private repositories', included: true },
      { name: 'Team management', included: true },
      { name: 'Branch protection rules', included: true },
      { name: 'Required reviews', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced CI/CD', included: true },
      { name: 'Audit logs', included: false },
      { name: 'SSO/SAML', included: false },
    ],
    cta: 'Coming Soon',
    ctaHref: '#',
    ctaVariant: 'outline' as const,
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced security needs',
    price: 'Custom',
    period: 'contact us',
    icon: Building2,
    popular: false,
    comingSoon: true,
    features: [
      { name: 'Everything in Team', included: true },
      { name: 'SSO/SAML authentication', included: true },
      { name: 'Audit logs & compliance', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'SLA guarantee', included: true },
      { name: 'On-premise option', included: true },
      { name: 'Custom contracts', included: true },
      { name: 'Training & onboarding', included: true },
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact',
    ctaVariant: 'outline' as const,
  },
];

const faqs = [
  {
    question: 'Is GitForge really free?',
    answer: 'Yes! GitForge is 100% free for public repositories. We believe open source should be accessible to everyone. Our free tier includes unlimited public repos, collaborators, issues, pull requests, and more.',
  },
  {
    question: 'What happens when Team/Enterprise launches?',
    answer: 'Your free account and public repositories will remain free forever. Team and Enterprise tiers will add private repositories and advanced features for those who need them.',
  },
  {
    question: 'Can I self-host GitForge?',
    answer: 'Yes! GitForge is open source. You can fork the repository and deploy your own instance on Vercel and Supabase. Check our GitHub repository for instructions.',
  },
  {
    question: 'How does GitForge compare to GitHub?',
    answer: 'GitForge is a lightweight alternative focused on simplicity and serverless architecture. While GitHub has more features, GitForge offers a clean, fast experience with zero infrastructure management.',
  },
  {
    question: 'Do you offer discounts for education or non-profits?',
    answer: 'When paid tiers launch, we plan to offer free Team tier access for students, educators, and registered non-profit organizations.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 md:py-24 border-b bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              Simple Pricing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Free for everyone.
              <br />
              <span className="text-primary">No hidden costs.</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Start building with GitForge today. Upgrade when you need private repositories
              and advanced team features.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${
                  plan.popular ? 'border-primary shadow-lg scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {plan.comingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto p-3 rounded-full bg-primary/10 mb-4">
                    <plan.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-center flex-1">
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-3">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-0.5" />
                        )}
                        <span
                          className={
                            feature.included ? '' : 'text-muted-foreground/50'
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={plan.ctaVariant}
                    className="w-full"
                    disabled={plan.comingSoon}
                  >
                    {plan.comingSoon ? (
                      <span>{plan.cta}</span>
                    ) : (
                      <Link href={plan.ctaHref}>
                        {plan.cta}
                        {!plan.comingSoon && <ArrowRight className="h-4 w-4 ml-2" />}
                      </Link>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison note */}
      <section className="py-12 border-y bg-muted/30">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Why choose GitForge?</h2>
            <p className="text-muted-foreground mb-6">
              GitForge is built on modern, serverless infrastructure. No servers to manage,
              no complex setup. Just push your code and collaborate.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Serverless</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">0</div>
                <div className="text-sm text-muted-foreground">Setup time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">Free</div>
                <div className="text-sm text-muted-foreground">Forever</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.question} className="border-b pb-6">
                  <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 border-t bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Create your free account and start hosting your code in seconds.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg" className="gap-2">
                <Link href="/signup">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/explore">Explore projects</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
