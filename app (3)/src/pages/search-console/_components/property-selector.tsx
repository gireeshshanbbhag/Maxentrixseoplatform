import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { CheckCircleIcon, GlobeIcon } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects">;
  onSelected: () => void;
};

type Property = {
  siteUrl: string;
  permissionLevel: string;
};

export default function PropertySelector({ open, onOpenChange, projectId, onSelected }: Props) {
  const listProperties = useAction(api.gsc.actions.listProperties);
  const setProperty = useMutation(api.gsc.mutations.setProjectProperty);

  const [properties, setProperties] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProperties() {
    setLoading(true);
    try {
      const props = await listProperties({});
      setProperties(props);
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("Failed to load properties");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(siteUrl: string) {
    setSelected(siteUrl);
    setSaving(true);
    try {
      await setProperty({ projectId, propertyUrl: siteUrl });
      toast.success("Property linked successfully");
      onSelected();
    } catch {
      toast.error("Failed to link property");
    } finally {
      setSaving(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open && !properties) {
      loadProperties();
    }
    onOpenChange(open);
  };

  // Load on mount
  if (open && !properties && !loading) {
    loadProperties();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a Search Console Property</DialogTitle>
          <DialogDescription>
            Choose which Google Search Console property to link to this project.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <Spinner />
            <span className="text-sm text-muted-foreground">Loading properties…</span>
          </div>
        ) : !properties ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load properties.{" "}
            <button className="underline text-primary" onClick={loadProperties}>
              Try again
            </button>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <GlobeIcon className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">No properties found</p>
            <p className="text-xs text-muted-foreground">
              Add your site to{" "}
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Google Search Console
              </a>{" "}
              first, then come back here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {properties.map((prop) => (
              <button
                key={prop.siteUrl}
                className={`w-full text-left rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/50 cursor-pointer ${selected === prop.siteUrl ? "border-primary bg-primary/5" : ""}`}
                onClick={() => handleSelect(prop.siteUrl)}
                disabled={saving}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium truncate max-w-[300px]">{prop.siteUrl}</div>
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">
                      {prop.permissionLevel.replace("sc-owner", "Owner").replace("siteOwner", "Owner").replace("siteFullUser", "Full user").replace("siteRestrictedUser", "Restricted user")}
                    </div>
                  </div>
                  {selected === prop.siteUrl && (
                    saving ? <Spinner className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4 text-primary" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
