import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { CheckIcon } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Connection = {
  _id: Doc<"ga4Connections">["_id"];
  googleEmail?: string;
  expiresAt: string;
  selectedProperties?: Record<string, string>;
};

type Property = { name: string; displayName: string };

export default function GA4PropertySelector({
  project,
  connection,
}: {
  project: Doc<"projects">;
  connection: Connection;
}) {
  const [properties, setProperties] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const listProperties = useAction(api.ga4.actions.listProperties);
  const setProperty = useMutation(api.ga4.mutations.setProjectProperty);

  async function loadProperties() {
    setLoading(true);
    try {
      const props = await listProperties({});
      setProperties(props);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to load GA4 properties");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(propertyId: string) {
    setSaving(propertyId);
    try {
      await setProperty({ projectId: project._id, propertyId });
      toast.success("GA4 property linked to project");
    } catch (e) {
      toast.error("Failed to save property");
    } finally {
      setSaving(null);
    }
  }

  if (!properties && !loading) {
    loadProperties();
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold">Select GA4 Property</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the Google Analytics 4 property for <strong>{project.name}</strong>
        </p>
        {connection.googleEmail && (
          <p className="text-xs text-muted-foreground mt-1">Connected as: {connection.googleEmail}</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : properties?.length === 0 ? (
        <div className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
          No GA4 properties found for this Google account.
        </div>
      ) : (
        <div className="space-y-2">
          {properties?.map((prop) => (
            <div
              key={prop.name}
              className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{prop.displayName}</div>
                <div className="text-xs text-muted-foreground font-mono">{prop.name}</div>
              </div>
              <Button
                size="sm"
                variant={saving === prop.name ? "secondary" : "default"}
                onClick={() => handleSelect(prop.name)}
                disabled={saving !== null}
              >
                {saving === prop.name ? (
                  <CheckIcon className="h-4 w-4" />
                ) : "Select"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
