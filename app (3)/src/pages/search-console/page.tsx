import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  SearchIcon,
  LinkIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  UnplugIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import GscDashboard from "./_components/gsc-dashboard.tsx";
import PropertySelector from "./_components/property-selector.tsx";

function buildAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/webmasters",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export default function SearchConsolePage() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const connection = useQuery(api.gsc.queries.getConnection, {});
  const googleClientId = useQuery(api.config.getGoogleClientId, {});
  const [showPropertySelector, setShowPropertySelector] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnectAction = useAction(api.gsc.actions.listProperties); // used via mutation directly
  const disconnectMutation = useMutation(api.gsc.mutations.disconnect);

  const isLoading = connection === undefined || projects === undefined;

  const redirectUri = `${window.location.origin}/gsc/callback`;

  function handleConnect() {
    if (!googleClientId) {
      toast.error("Google Client ID not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Secrets (Advanced → Secrets in the sidebar).");
      return;
    }
    window.location.href = buildAuthUrl(googleClientId, redirectUri);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectMutation({});
      toast.success("Google Search Console disconnected");
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  const selectedProperty = connection?.selectedProperties?.[activeProjectId ?? ""];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <SearchIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Search Console</h1>
              <p className="text-sm text-muted-foreground">Google Search Console data for {project?.name ?? "your site"}</p>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : connection ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10">
                <CheckCircleIcon className="h-3 w-3" />
                {connection.googleEmail ?? "Connected"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPropertySelector(true)}
              >
                <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                Change property
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-destructive hover:text-destructive cursor-pointer"
              >
                <UnplugIcon className="h-3.5 w-3.5 mr-1.5" />
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} size="sm">
              <LinkIcon className="h-4 w-4 mr-1.5" />
              Connect Google Search Console
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !connection ? (
        <GscConnectPrompt onConnect={handleConnect} redirectUri={redirectUri} />
      ) : !project ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          Select a project to view Search Console data
        </div>
      ) : !selectedProperty ? (
        <div className="flex flex-col items-center justify-center gap-4 h-64 text-center px-4">
          <AlertCircleIcon className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">No property selected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Link a Search Console property to this project to see data
            </p>
          </div>
          <Button size="sm" onClick={() => setShowPropertySelector(true)}>
            Select property for {project.name}
          </Button>
        </div>
      ) : (
        <GscDashboard
          project={project}
          propertyUrl={selectedProperty}
          onChangeProperty={() => setShowPropertySelector(true)}
        />
      )}

      {showPropertySelector && activeProjectId && (
        <PropertySelector
          open={showPropertySelector}
          onOpenChange={setShowPropertySelector}
          projectId={activeProjectId}
          onSelected={() => setShowPropertySelector(false)}
        />
      )}
    </div>
  );
}

function GscConnectPrompt({ onConnect, redirectUri }: { onConnect: () => void; redirectUri: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center max-w-lg mx-auto">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <SearchIcon className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Connect Google Search Console</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Connect your Google Search Console account to see search queries, page performance,
          CTR opportunities, and automatic keyword rank tracking.
        </p>
      </div>

      {/* Setup checklist */}
      <div className="w-full text-left rounded-xl border p-4 space-y-3 bg-muted/30">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google Cloud Setup Checklist</p>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>
            <span>Enable <strong>Google Search Console API</strong> in APIs &amp; Services → Library</span>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            <span>OAuth consent screen → add your Google account as a <strong>Test user</strong></span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-primary font-bold shrink-0">3.</span>
            <div className="flex-1 min-w-0">
              <span>In your OAuth Client ID, add this <strong>exact</strong> Authorized Redirect URI:</span>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate font-mono">{redirectUri}</code>
                <Button size="sm" variant="secondary" className="shrink-0 h-7 text-xs cursor-pointer" onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                This must be added <strong>exactly</strong> as shown above in Google Cloud Console →
                Credentials → OAuth 2.0 Client ID → Authorized redirect URIs.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-bold shrink-0">4.</span>
            <span>Also add your custom domain under <strong>Authorized domains</strong> on the OAuth consent screen.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full text-left">
        {[
          "Search queries & clicks",
          "Page impressions & CTR",
          "Average position tracking",
          "URL Inspection API",
          "Declining & growing queries",
          "Sitemap management",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <CheckCircleIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      <Button onClick={onConnect} className="w-full max-w-xs">
        <LinkIcon className="h-4 w-4 mr-2" />
        Connect with Google
      </Button>

      <p className="text-xs text-muted-foreground">
        Requires{" "}
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Google Search Console <ExternalLinkIcon className="h-3 w-3 inline" />
        </a>{" "}
        access for your website.
      </p>
      <p className="text-xs text-muted-foreground">
        By connecting, you agree to our{" "}
        <a href="/terms" target="_blank" className="underline hover:text-foreground">Terms of Service</a>
        {" "}and{" "}
        <a href="/privacy" target="_blank" className="underline hover:text-foreground">Privacy Policy</a>.
      </p>
    </div>
  );
}
