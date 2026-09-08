import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function GA4Callback() {
  const navigate = useNavigate();
  const exchangeCode = useAction(api.ga4.actions.exchangeCode);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const errorParam = params.get("error");

    if (errorParam) {
      setError(`Google denied access: ${errorParam}`);
      return;
    }

    if (!code) {
      setError("No authorization code received from Google.");
      return;
    }

    const redirectUri = sessionStorage.getItem("ga4_redirect_uri") ?? `${window.location.origin}/ga4/callback`;
    sessionStorage.removeItem("ga4_redirect_uri");

    exchangeCode({ code, redirectUri })
      .then(() => navigate("/analytics"))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to connect Google Analytics";
        setError(msg);
      });
  }, [exchangeCode, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="text-destructive font-medium mb-2">Connection failed</div>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button
          className="mt-4 text-sm text-primary underline"
          onClick={() => navigate("/analytics")}
        >
          Back to Analytics
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">Connecting Google Analytics…</p>
    </div>
  );
}
