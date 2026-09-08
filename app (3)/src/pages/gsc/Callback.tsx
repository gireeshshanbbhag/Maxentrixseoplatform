import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { ConvexError } from "convex/values";

export default function GscCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchangeCode = useAction(api.gsc.actions.exchangeCode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(`Google denied access: ${errorParam}`);
      return;
    }

    if (!code) {
      setError("No authorization code received");
      return;
    }

    const redirectUri = `${window.location.origin}/gsc/callback`;

    exchangeCode({ code, redirectUri })
      .then(() => {
        navigate("/search-console", { replace: true });
      })
      .catch((e) => {
        if (e instanceof ConvexError) {
          setError((e.data as { message: string }).message);
        } else {
          setError("Failed to connect Google Search Console");
        }
      });
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-destructive font-medium">Connection failed</div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a href="/search-console" className="text-sm text-primary underline">
            Go back to Search Console
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Spinner className="mx-auto" />
        <p className="text-sm text-muted-foreground">Connecting Google Search Console…</p>
      </div>
    </div>
  );
}
