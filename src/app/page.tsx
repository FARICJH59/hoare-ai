import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge }  from '@/components/ui/badge';
import {
  Sparkles, ArrowRight, Zap, Shield, Globe, Brain, Code2, Database,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-lg tracking-tight">HOARE.ai</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/chat">
              <Button variant="ghost" size="sm">Chat</Button>
            </Link>
            <Link href="/chat">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-6 gap-1.5">
            <Zap className="w-3 h-3" />
            Enterprise AI Platform
          </Badge>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground via-foreground/90 to-muted-foreground bg-clip-text text-transparent">
            Build anything with<br />
            <span className="text-blue-500">HOARE.ai</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Enterprise AI assistant that understands your goals, generates full-stack architectures,
            creates execution plans, and connects to QGPS for autonomous deployment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/chat">
              <Button size="lg" className="gap-2 text-base px-8">
                <Sparkles className="w-4 h-4" />
                Start Building
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8">
                View Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Everything you need to build fast</h2>
          <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">
            HOARE.ai combines AI reasoning with autonomous agents to turn natural language into production-ready solutions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to build?</h2>
          <p className="text-muted-foreground mb-8">
            Join teams building enterprise platforms with HOARE.ai autonomous agents.
          </p>
          <Link href="/chat">
            <Button size="lg" className="gap-2 px-10 text-base">
              Open HOARE.ai <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>HOARE.ai</span>
          </div>
          <p>© {new Date().getFullYear()} HOARE.ai. Enterprise SaaS AI Platform.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <div className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

const FEATURES = [
  {
    icon: Brain,
    title: 'Intent Understanding',
    description: 'HOARE agents classify your industry, detect required capabilities, and estimate project complexity automatically.',
  },
  {
    icon: Code2,
    title: 'Project Generation',
    description: 'Generate complete repository structures, architecture manifests, CI/CD pipelines, and Kubernetes configs.',
  },
  {
    icon: Zap,
    title: 'QGPS Integration',
    description: 'Submit workflows directly to the QGPS Control Plane for autonomous execution, monitoring, and remediation.',
  },
  {
    icon: Database,
    title: 'Knowledge Layer',
    description: 'Industry-specific best practices, patterns, and recommendations built into every generated solution.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Multi-tenancy, RBAC, authentication, audit logging, rate limiting, and security headers out of the box.',
  },
  {
    icon: Globe,
    title: 'Streaming Responses',
    description: 'Real-time streaming chat with full markdown rendering, code highlighting, and conversation history.',
  },
];
