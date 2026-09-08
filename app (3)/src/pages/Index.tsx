import { Link, Navigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  RadarIcon,
  ShieldCheckIcon,
  TargetIcon,
  PenToolIcon,
  MapPinIcon,
  SparklesIcon,
  BarChart3Icon,
  ArrowRightIcon,
} from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "Technical SEO Audit",
    description:
      "Crawl your site, detect issues, and get prioritized fix recommendations.",
  },
  {
    icon: TargetIcon,
    title: "Keyword Intelligence",
    description:
      "Track rankings, discover opportunities, and monitor keyword performance.",
  },
  {
    icon: PenToolIcon,
    title: "Content Optimization",
    description:
      "AI-powered content analysis, writing studio, and quality scoring.",
  },
  {
    icon: MapPinIcon,
    title: "Local SEO",
    description:
      "NAP consistency, local schema, location pages, and geo-targeted tracking.",
  },
  {
    icon: SparklesIcon,
    title: "AI Search Readiness",
    description:
      "AEO, GEO, and generative search visibility scoring and recommendations.",
  },
  {
    icon: BarChart3Icon,
    title: "Google-First Analytics",
    description:
      "Search Console, Analytics, and PageSpeed data in one unified view.",
  },
];

export default function Index() {
  return (
    <>
      <Authenticated>
        <Navigate to="/dashboard" replace />
      </Authenticated>
      <Unauthenticated>
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-20">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "4rem 4rem",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <RadarIcon className="h-8 w-8 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance">
            Maxentrix SEO Platform
          </h1>

          {/* Tagline */}
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground max-w-lg">
            Understand. Optimize. Grow.
          </p>

          <p className="mt-2 text-sm text-muted-foreground/80 max-w-md">
            A Google-first SEO platform. No guesswork, no vanity metrics. Just
            evidence-based actions to improve your search visibility.
          </p>

          {/* Auth CTA */}
          <div className="mt-8">
            <AuthLoading>
              <Skeleton className="h-10 w-40" />
            </AuthLoading>
            <Unauthenticated>
              <SignInButton />
            </Unauthenticated>
            <Authenticated>
              <Button asChild size="lg">
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Authenticated>
          </div>
        </div>

        {/* Feature grid */}
        <div className="relative z-10 mt-20 w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-5 transition-colors hover:bg-accent/50"
              >
                <feature.icon className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>{"Maxentrix SEO Platform"} &copy; {new Date().getFullYear()}. Built on official Google data and documentation.</p>
        <div className="mt-2 flex items-center justify-center gap-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <span className="opacity-30">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        </div>
      </footer>
    </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AuthLoading>
    </>
  );
}
