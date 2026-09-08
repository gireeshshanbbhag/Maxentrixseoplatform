import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  ArrowLeftIcon, GlobeIcon, MapPinIcon, PlusIcon, Trash2Icon,
  BuildingIcon, SettingsIcon, ExternalLinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import { getWebsiteTypeLabel, getConversionGoalLabel, getLanguageLabel, LANGUAGES } from "@/lib/constants.ts";
import EditProjectDialog from "./_components/edit-project-dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export default function ProjectSettingsPage() {
  return (
    <>
      <AuthLoading><div className="p-8"><Skeleton className="h-64 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="flex justify-center p-8"><SignInButton /></div></Unauthenticated>
      <Authenticated><ProjectSettingsContent /></Authenticated>
    </>
  );
}

function ProjectSettingsContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const project = useQuery(
    api.projects.getById,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );
  const locations = useQuery(
    api.projects.getLocations,
    projectId ? { projectId: projectId as Id<"projects"> } : "skip"
  );

  const addLocation = useMutation(api.projects.addLocation);
  const removeLocation = useMutation(api.projects.removeLocation);
  const updateProject = useMutation(api.projects.update);

  const [editOpen, setEditOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [removingLocId, setRemovingLocId] = useState<Id<"projectLocations"> | null>(null);

  // Add location form state
  const [locCountry, setLocCountry] = useState("");
  const [locState, setLocState] = useState("");
  const [locDistrict, setLocDistrict] = useState("");
  const [locCity, setLocCity] = useState("");
  const [locLanguage, setLocLanguage] = useState("en");

  if (project === undefined || project === null || locations === undefined) {
    return <div className="p-6 space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-64 w-full" /></div>;
  }

  async function handleAddLocation() {
    if (!locCountry || !projectId) { toast.error("Country is required"); return; }
    try {
      await addLocation({
        projectId: projectId as Id<"projects">,
        country: locCountry,
        state: locState || undefined,
        district: locDistrict || undefined,
        city: locCity || undefined,
        isPrimary: locations?.length === 0,
      });
      toast.success("Location added");
      setAddLocOpen(false);
      setLocCountry(""); setLocState(""); setLocDistrict(""); setLocCity("");
    } catch {
      toast.error("Failed to add location");
    }
  }

  async function handleRemoveLocation(locId: Id<"projectLocations">) {
    setRemovingLocId(locId);
    try {
      await removeLocation({ locationId: locId });
      toast.success("Location removed");
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to remove location");
      }
    } finally {
      setRemovingLocId(null);
    }
  }

  // Narrowed references (TS doesn't narrow into inner function bodies)
  const proj = project;
  const locs = locations;

  async function handleArchiveToggle() {
    const newStatus = proj.status === "archived" ? "active" : "archived";
    try {
      await updateProject({ projectId: proj._id, status: newStatus });
      toast.success(newStatus === "archived" ? "Project archived" : "Project restored");
    } catch {
      toast.error("Failed to update project status");
    }
  }

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex items-start justify-between py-2 border-b last:border-0">
        <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
        <span className="text-sm text-right">{value}</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="cursor-pointer">
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <GlobeIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">{proj.name}</h1>
            <a href={proj.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
              {proj.websiteUrl} <ExternalLinkIcon className="h-3 w-3" />
            </a>
          </div>
        </div>
        <div className="flex gap-2 ml-auto">
          <Badge variant={proj.status === "archived" ? "secondary" : "default"} className="text-xs">
            {proj.status === "archived" ? "Archived" : "Active"}
          </Badge>
          <Button size="sm" onClick={() => setEditOpen(true)} className="cursor-pointer">
            <SettingsIcon className="h-3.5 w-3.5 mr-1.5" />Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Target Locations</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="danger">Settings</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <GlobeIcon className="h-4 w-4 text-primary" />Website
            </div>
            <InfoRow label="Project name" value={proj.name} />
            <InfoRow label="Website URL" value={proj.websiteUrl} />
            <InfoRow label="Website type" value={getWebsiteTypeLabel(proj.websiteType)} />
            <InfoRow label="Status" value={proj.status} />
          </div>

          {(proj.businessName || proj.businessCategory || proj.businessDescription || proj.primaryServices) && (
            <div className="rounded-xl border p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
                <BuildingIcon className="h-4 w-4 text-primary" />Business
              </div>
              <InfoRow label="Business name" value={proj.businessName} />
              <InfoRow label="Category" value={proj.businessCategory} />
              <InfoRow label="Description" value={proj.businessDescription} />
              <InfoRow label="Primary services" value={proj.primaryServices} />
              <InfoRow label="Products" value={proj.products} />
              <InfoRow label="Primary audience" value={proj.primaryAudience} />
              <InfoRow label="Conversion goal" value={proj.primaryConversionGoal ? getConversionGoalLabel(proj.primaryConversionGoal) : undefined} />
              <InfoRow label="Contact email" value={proj.contactEmail} />
            </div>
          )}

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <MapPinIcon className="h-4 w-4 text-primary" />Location & Language
            </div>
            <InfoRow label="Country" value={proj.country} />
            <InfoRow label="State / Province" value={proj.state} />
            <InfoRow label="District" value={proj.district} />
            <InfoRow label="City" value={proj.city} />
            <InfoRow label="Primary language" value={proj.primaryLanguage ? getLanguageLabel(proj.primaryLanguage) : undefined} />
          </div>

          {proj.notes && (
            <div className="rounded-xl border p-4">
              <div className="text-sm font-semibold mb-2">Notes</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{proj.notes}</p>
            </div>
          )}
        </TabsContent>

        {/* Target Locations */}
        <TabsContent value="locations" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Manage geo-targeted locations for rank tracking and local SEO</p>
            <Button size="sm" onClick={() => setAddLocOpen(true)}>
              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />Add location
            </Button>
          </div>

          {locs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MapPinIcon /></EmptyMedia>
                <EmptyTitle>No target locations</EmptyTitle>
                <EmptyDescription>Add locations to track rankings in specific regions</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setAddLocOpen(true)}>
                  <PlusIcon className="h-3.5 w-3.5 mr-1" />Add location
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-2">
              {locs.map((loc) => (
                <div key={loc._id} className="rounded-xl border p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <div className="text-sm font-medium">
                        {[loc.city, loc.district, loc.state, loc.country].filter(Boolean).join(", ")}
                      </div>
                      {loc.isPrimary && (
                        <Badge className="text-[10px] mt-0.5 bg-primary/10 text-primary border-primary/20 border">Primary</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive cursor-pointer"
                    disabled={removingLocId === loc._id}
                    onClick={() => handleRemoveLocation(loc._id)}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="mt-4 space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-semibold">Connected integrations</div>
            <div className="space-y-2">
              <IntegrationRow label="Google Search Console" value={proj.gscPropertyUrl}
                placeholder="Not connected — go to Search Console to connect" />
              <IntegrationRow label="Google Analytics 4" value={proj.ga4PropertyId}
                placeholder="Not connected — go to Analytics to connect" />
              <IntegrationRow label="Google Business Profile" value={proj.gbpStatus}
                placeholder="Not configured" />
            </div>
          </div>

          {/* SpySERP integration */}
          <SpySerpProjectSection project={proj} />

          <p className="text-xs text-muted-foreground">
            Manage Google integrations from their respective pages in the sidebar (Search Console, Analytics).
          </p>
        </TabsContent>

        {/* Danger zone / Settings */}
        <TabsContent value="danger" className="mt-4 space-y-4">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-semibold">Project status</div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">
                  {proj.status === "archived"
                    ? "This project is archived. It will still appear in your list but is marked inactive."
                    : "Archive this project to mark it as inactive without deleting it."}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleArchiveToggle}
                className="shrink-0 cursor-pointer"
              >
                {proj.status === "archived" ? "Restore project" : "Archive project"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-destructive/30 p-4 space-y-3">
            <div className="text-sm font-semibold text-destructive">Danger zone</div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Delete this project permanently. All keywords, audits, and data will be removed.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => navigate(`/projects?delete=${proj._id}`)}
              >
                <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />Delete project
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      {editOpen && (
        <EditProjectDialog project={proj} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {/* Add location dialog */}
      <Dialog open={addLocOpen} onOpenChange={setAddLocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add target location</DialogTitle>
            <DialogDescription>Add a geographic location to track rankings and local SEO</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Country <span className="text-red-500">*</span></label>
              <Input value={locCountry} onChange={(e) => setLocCountry(e.target.value)} placeholder="United States" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">State</label>
                <Input value={locState} onChange={(e) => setLocState(e.target.value)} placeholder="California" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">District</label>
                <Input value={locDistrict} onChange={(e) => setLocDistrict(e.target.value)} placeholder="LA County" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">City</label>
                <Input value={locCity} onChange={(e) => setLocCity(e.target.value)} placeholder="Los Angeles" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Language</label>
              <Select value={locLanguage} onValueChange={setLocLanguage}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddLocOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLocation} disabled={!locCountry}>Add location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IntegrationRow({ label, value, placeholder }: { label: string; value?: string | null; placeholder: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm font-medium">{label}</span>
      <span className={`text-sm ${value ? "text-foreground" : "text-muted-foreground"}`}>
        {value ?? placeholder}
      </span>
    </div>
  );
}

type ProjectDoc = {
  _id: Id<"projects">;
  spySerpProjectId?: number;
  [key: string]: unknown;
};

function SpySerpProjectSection({ project }: { project: ProjectDoc }) {
  const [isDebugging, setIsDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<Record<string, string> | null>(null);
  const debugWizard = useAction(api.spyserp.actions.debugWizardMethods);

  async function handleDebug() {
    if (!project.spySerpProjectId) return;
    setIsDebugging(true);
    setDebugResults(null);
    try {
      const results = await debugWizard({ spySerpProjectId: project.spySerpProjectId });
      setDebugResults(results);
    } catch {
      setDebugResults({ error: "Debug probe failed — check Convex logs" });
    } finally {
      setIsDebugging(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold">SERP Rank Tracking</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Automatically tracks keyword positions across Google search results
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-t text-sm">
        <span className="font-medium">Status</span>
        <span className={project.spySerpProjectId ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
          {project.spySerpProjectId
            ? `Active — project #${project.spySerpProjectId}`
            : "Not set up — click \"Sync SERP\" on the Keywords page"}
        </span>
      </div>

      {project.spySerpProjectId && (
        <div className="border-t pt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDebug}
            disabled={isDebugging}
            className="w-full text-xs"
          >
            {isDebugging ? "Probing API methods…" : "Debug: Probe wizard API methods"}
          </Button>
          {debugResults && (
            <div className="mt-3 rounded-lg bg-muted p-3 text-xs font-mono space-y-1 max-h-64 overflow-y-auto">
              {Object.entries(debugResults).map(([method, result]) => (
                <div key={method} className={result.startsWith("SUCCESS") ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                  <span className="font-semibold">{method}:</span>{" "}
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
        <p>
          Tracking is set up automatically on first <strong>Sync SERP</strong> click.
          Requires <span className="font-mono font-semibold">SPYSERP_API_KEY</span> in <strong>Advanced → Secrets</strong>.
        </p>
        <a
          href="https://spyserp.com/api/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          SpySERP API docs <ExternalLinkIcon className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
