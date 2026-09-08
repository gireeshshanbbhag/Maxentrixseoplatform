import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { BarChart3Icon, LinkIcon, CheckCircleIcon, RefreshCwIcon, UnplugIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import GA4Dashboard from "./_components/ga4-dashboard.tsx";
import GA4PropertySelector from "./_components/ga4-property-selector.tsx";

const GA4_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/analytics.manage.users.readonly",
  "https://www.googleapis.com/auth/analytics",
  "openid",
  "email",
  "profile",
].join(" ");

function AnalyticsContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const connection = useQuery(api.ga4.queries.getConnection, {});
  const googleClientId = useQuery(api.config.getGoogleClientId, {});
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const disconnectMutation = useMutation(api.ga4.mutations.disconnect);

  function handleConnect() {
    if (!googleClientId) {
      toast.error("Google Client ID not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Secrets (Advanced → Secrets in the sidebar).");
      return;
    }

    setConnecting(true);
    const redirectUri = `${window.location.origin}/ga4/callback`;
    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GA4_SCOPES,
      access_type: "offline",
      prompt: "consent",
    });

    sessionStorage.setItem("ga4_redirect_uri", redirectUri);
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectMutation({});
      toast.success("Google Analytics disconnected");
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (projects === undefined || connection === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <BarChart3Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">No project selected</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a project from the top of the sidebar to view analytics.</p>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center max-w-lg mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
          <BarChart3Icon className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Connect Google Analytics 4</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-6 leading-relaxed">
          Connect your GA4 account to see organic traffic trends, top landing pages, audience behavior, and cross-reference with your GSC data for deeper SEO insights.
        </p>

        <div className="grid grid-cols-2 gap-3 text-left w-full max-w-sm mb-8">
          {[
            "Organic traffic trends",
            "Top landing pages",
            "Audience & devices",
            "Engagement metrics",
            "Conversions tracking",
            "GSC + GA4 analysis",
          ].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {f}
            </div>
          ))}
        </div>

        <Button onClick={handleConnect} disabled={connecting} size="lg">
          <LinkIcon className="mr-2 h-4 w-4" />
          Connect with Google
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Requires Google Analytics 4 access for your website.
        </p>
      </div>
    );
  }

  const propertyId = connection.selectedProperties?.[activeProjectId ?? ""];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <BarChart3Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Analytics</h1>
              <p className="text-sm text-muted-foreground">Google Analytics 4 for {project?.name ?? "your site"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10">
              <CheckCircleIcon className="h-3 w-3" />
              {connection.googleEmail ?? "Connected"}
            </Badge>
            {propertyId && (
              <Button variant="ghost" size="sm" onClick={handleConnect} className="cursor-pointer">
                <RefreshCwIcon className="h-3.5 w-3.5 mr-1.5" />
                Change property
              </Button>
            )}
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
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {!propertyId ? (
          <GA4PropertySelector project={project} connection={connection} />
        ) : (
          <GA4Dashboard project={project} propertyId={propertyId} connection={connection} />
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6"><Skeleton className="h-40 w-full" /></div>
      </AuthLoading>
      <Unauthenticated>
        <div className="p-6 text-center"><SignInButton /></div>
      </Unauthenticated>
      <Authenticated>
        <AnalyticsContent />
      </Authenticated>
    </>
  );
}
