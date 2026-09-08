import {
  SparklesIcon,
  SearchIcon,
  UserIcon,
  BellIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";

function SetupGuide() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <SearchIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Google Search Console</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Connect GSC for keyword rank tracking and search data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="secondary" onClick={(e) => e.stopPropagation()}>
              <Link to="/search-console">Open</Link>
            </Button>
            {open ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent className="pt-0 pl-12">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              To enable Google Search Console integration, you need to create OAuth 2.0 credentials
              in Google Cloud Console and add them as secrets.
            </p>

            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                <div>
                  <p className="font-medium text-xs">Create a Google Cloud project</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Go to{" "}
                    <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                      Google Cloud Console <ExternalLinkIcon className="h-3 w-3" />
                    </a>{" "}
                    and create a new project or use an existing one.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                <div>
                  <p className="font-medium text-xs">Enable APIs</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Enable: <strong>Google Search Console API</strong> and <strong>Google OAuth2 API</strong> (People API).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                <div>
                  <p className="font-medium text-xs">Create OAuth 2.0 credentials</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In APIs &amp; Services → Credentials, create an OAuth 2.0 Client ID (Web application type).
                    Add authorized redirect URI:
                  </p>
                  <code className="block mt-1 text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                    {window.location.origin}/gsc/callback
                  </code>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">4</span>
                <div>
                  <p className="font-medium text-xs">Add secrets to Hercules</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    In the Hercules sidebar → Advanced → Secrets, add:
                  </p>
                  <div className="mt-1 space-y-1">
                    <div className="flex gap-2 items-center">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">GOOGLE_CLIENT_ID</code>
                      <span className="text-xs text-muted-foreground">Your OAuth client ID</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">GOOGLE_CLIENT_SECRET</code>
                      <span className="text-xs text-muted-foreground">Your OAuth client secret</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">5</span>
                <div>
                  <p className="font-medium text-xs">Connect in Search Console</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Go to <Link to="/search-console" className="text-primary underline">Search Console</Link> and click "Connect with Google".
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

const COMING_SOON_SECTIONS = [
  {
    icon: SparklesIcon,
    title: "AI Providers",
    description:
      "Configure OpenAI, Google Gemini, and Anthropic Claude for content generation and analysis.",
  },
  {
    icon: BellIcon,
    title: "Notifications",
    description:
      "Configure alerts for ranking drops, traffic changes, and critical issues.",
  },
  {
    icon: UserIcon,
    title: "Account",
    description:
      "Manage your profile, team members, and account preferences.",
  },
];

export default function Settings() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your Maxentrix SEO Platform workspace
        </p>
      </div>

      <div className="space-y-4">
        <SetupGuide />

        {COMING_SOON_SECTIONS.map((section) => (
          <Card key={section.title} className="transition-colors hover:bg-accent/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-xs">Coming soon</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed pl-12">
                {section.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
