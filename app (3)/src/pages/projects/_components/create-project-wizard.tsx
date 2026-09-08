import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, GlobeIcon, BuildingIcon,
  MapPinIcon, SettingsIcon, LayoutGridIcon, CheckCircleIcon, KeyRoundIcon,
  UserCircleIcon, WebhookIcon, RefreshCwIcon, CopyIcon, ZapIcon,
  InfoIcon, RocketIcon, ScanSearchIcon, ChevronRightIcon, AlertCircleIcon,
  WifiIcon, XCircleIcon, EyeIcon, EyeOffIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { WEBSITE_TYPES, CONVERSION_GOALS, LANGUAGES } from "@/lib/constants.ts";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// ─── CMS Platform Registry ────────────────────────────────────────────────────

export type CmsPlatform = {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  connectable: boolean;
  category: "cms" | "ecommerce" | "headless" | "static" | "other";
};

export const CMS_PLATFORMS: CmsPlatform[] = [
  { id: "wordpress",   name: "WordPress",    icon: "🔵", description: "Self-hosted or WordPress.com",    color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20",       connectable: true,  category: "cms" },
  { id: "webflow",     name: "Webflow",      icon: "🌊", description: "Visual web design platform",     color: "border-cyan-300 bg-cyan-50 dark:bg-cyan-950/20",        connectable: true,  category: "cms" },
  { id: "wix",         name: "Wix",          icon: "⚡", description: "Drag-and-drop website builder",  color: "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20",  connectable: true,  category: "cms" },
  { id: "squarespace", name: "Squarespace",  icon: "⬛", description: "All-in-one website platform",    color: "border-gray-400 bg-gray-50 dark:bg-gray-950/20",         connectable: true,  category: "cms" },
  { id: "ghost",       name: "Ghost",        icon: "👻", description: "Modern publishing platform",     color: "border-slate-300 bg-slate-50 dark:bg-slate-950/20",     connectable: true,  category: "cms" },
  { id: "drupal",      name: "Drupal",       icon: "💧", description: "Open-source CMS framework",     color: "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20",  connectable: true,  category: "cms" },
  { id: "joomla",      name: "Joomla",       icon: "🟠", description: "Open-source CMS platform",      color: "border-orange-300 bg-orange-50 dark:bg-orange-950/20",  connectable: true,  category: "cms" },
  { id: "typo3",       name: "TYPO3",        icon: "🔴", description: "Enterprise open-source CMS",    color: "border-red-300 bg-red-50 dark:bg-red-950/20",           connectable: false, category: "cms" },
  { id: "umbraco",     name: "Umbraco",      icon: "🔷", description: ".NET-based open-source CMS",    color: "border-blue-200 bg-blue-50 dark:bg-blue-950/10",        connectable: false, category: "cms" },
  { id: "shopify",     name: "Shopify",      icon: "🛍️", description: "Leading e-commerce platform",   color: "border-green-300 bg-green-50 dark:bg-green-950/20",     connectable: true,  category: "ecommerce" },
  { id: "magento",     name: "Magento",      icon: "🔶", description: "Adobe Commerce platform",       color: "border-orange-400 bg-orange-50 dark:bg-orange-950/20",  connectable: true,  category: "ecommerce" },
  { id: "bigcommerce", name: "BigCommerce",  icon: "🛒", description: "SaaS e-commerce platform",      color: "border-blue-400 bg-blue-50 dark:bg-blue-950/20",        connectable: true,  category: "ecommerce" },
  { id: "woocommerce", name: "WooCommerce",  icon: "🟣", description: "WordPress e-commerce plugin",   color: "border-purple-300 bg-purple-50 dark:bg-purple-950/20",  connectable: true,  category: "ecommerce" },
  { id: "prestashop",  name: "PrestaShop",   icon: "🔑", description: "Open-source e-commerce",        color: "border-pink-300 bg-pink-50 dark:bg-pink-950/20",        connectable: true,  category: "ecommerce" },
  { id: "opencart",    name: "OpenCart",     icon: "🛒", description: "Open-source shopping cart",     color: "border-teal-300 bg-teal-50 dark:bg-teal-950/20",        connectable: true,  category: "ecommerce" },
  { id: "volusion",    name: "Volusion",     icon: "🔮", description: "All-in-one e-commerce",         color: "border-violet-300 bg-violet-50 dark:bg-violet-950/20",  connectable: false, category: "ecommerce" },
  { id: "contentful",  name: "Contentful",   icon: "🧩", description: "Headless CMS & content platform", color: "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20", connectable: true, category: "headless" },
  { id: "sanity",      name: "Sanity",       icon: "✏️", description: "Structured content platform",   color: "border-red-400 bg-red-50 dark:bg-red-950/20",           connectable: true,  category: "headless" },
  { id: "strapi",      name: "Strapi",       icon: "⚙️", description: "Open-source headless CMS",      color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",  connectable: true,  category: "headless" },
  { id: "directus",    name: "Directus",     icon: "📦", description: "Open-source data platform",     color: "border-purple-300 bg-purple-50 dark:bg-purple-950/10",  connectable: true,  category: "headless" },
  { id: "payload",     name: "Payload CMS",  icon: "🚀", description: "TypeScript-first headless CMS", color: "border-slate-400 bg-slate-50 dark:bg-slate-950/20",     connectable: true,  category: "headless" },
  { id: "storyblok",   name: "Storyblok",    icon: "📝", description: "Visual headless CMS",           color: "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/20",        connectable: true,  category: "headless" },
  { id: "hercules",    name: "Hercules",     icon: "⚡", description: "Hercules app platform",         color: "border-purple-400 bg-purple-50 dark:bg-purple-950/20",  connectable: true,  category: "static" },
  { id: "nextjs",      name: "Next.js",      icon: "▲", description: "React framework (Vercel)",      color: "border-gray-300 bg-gray-50 dark:bg-gray-950/20",         connectable: false, category: "static" },
  { id: "nuxt",        name: "Nuxt",         icon: "💚", description: "Vue.js framework",              color: "border-green-400 bg-green-50 dark:bg-green-950/20",     connectable: false, category: "static" },
  { id: "gatsby",      name: "Gatsby",       icon: "💜", description: "React static site generator",   color: "border-purple-400 bg-purple-50 dark:bg-purple-950/10",  connectable: false, category: "static" },
  { id: "hugo",        name: "Hugo",         icon: "🐹", description: "Fast static site generator",    color: "border-pink-300 bg-pink-50 dark:bg-pink-950/20",        connectable: false, category: "static" },
  { id: "jekyll",      name: "Jekyll",       icon: "💎", description: "Ruby static site generator",    color: "border-red-300 bg-red-50 dark:bg-red-950/20",           connectable: false, category: "static" },
  { id: "custom",      name: "Custom / Other", icon: "🔧", description: "Custom-built or other",      color: "border-gray-200 bg-muted/30",                            connectable: false, category: "other" },
];

const CATEGORY_LABELS: Record<string, string> = {
  cms: "Content Management Systems",
  ecommerce: "E-Commerce Platforms",
  headless: "Headless CMS",
  static: "Static & Custom",
  other: "Other",
};

// Platforms with live API test support in this wizard
const PLATFORMS_WITH_API_TEST = new Set(["wordpress", "webflow", "wix"]);

// Credential config for generic platforms
const CMS_CRED_CONFIG: Record<string, {
  label: string;
  placeholder: string;
  requiresSiteUrl: boolean;
  siteUrlPlaceholder?: string;
  extraField?: { label: string; placeholder: string };
}> = {
  shopify:     { label: "Admin API Access Token", placeholder: "shpat_xxxxxxxxxxxx", requiresSiteUrl: true, siteUrlPlaceholder: "https://mystore.myshopify.com" },
  ghost:       { label: "Admin API Key", placeholder: "xxxxxxxx:xxxxxxxx", requiresSiteUrl: true },
  squarespace: { label: "API Key", placeholder: "Your Squarespace API key", requiresSiteUrl: true },
  drupal:      { label: "Username:Password", placeholder: "admin:yourpassword", requiresSiteUrl: true },
  joomla:      { label: "API Token", placeholder: "Your Joomla token", requiresSiteUrl: true },
  magento:     { label: "Integration Access Token", placeholder: "Your Magento token", requiresSiteUrl: true },
  bigcommerce: { label: "Admin API Access Token", placeholder: "Your BigCommerce token", requiresSiteUrl: true },
  woocommerce: { label: "Consumer Key:Secret", placeholder: "ck_xxxx:cs_xxxx", requiresSiteUrl: true },
  prestashop:  { label: "API Key", placeholder: "Your PrestaShop key", requiresSiteUrl: true },
  opencart:    { label: "API Key", placeholder: "Your OpenCart key", requiresSiteUrl: true },
  contentful:  { label: "Content Management Token", placeholder: "Your Contentful CMA token", requiresSiteUrl: false, extraField: { label: "Space ID", placeholder: "your_space_id" } },
  sanity:      { label: "API Token", placeholder: "sk...", requiresSiteUrl: false, extraField: { label: "Project ID", placeholder: "your_project_id" } },
  strapi:      { label: "API Token", placeholder: "Your Strapi API token", requiresSiteUrl: true },
  directus:    { label: "Static Access Token", placeholder: "Your Directus token", requiresSiteUrl: true },
  storyblok:   { label: "Personal Access Token", placeholder: "Your Storyblok token", requiresSiteUrl: false, extraField: { label: "Space ID", placeholder: "123456" } },
  payload:     { label: "API Key", placeholder: "Your Payload API key", requiresSiteUrl: true },
  webflow:     { label: "API Token", placeholder: "Your Webflow API token", requiresSiteUrl: false, extraField: { label: "Site ID (optional)", placeholder: "your_site_id" } },
  wix:         { label: "API Key", placeholder: "Your Wix API key", requiresSiteUrl: false, extraField: { label: "Site ID", placeholder: "your_site_id" } },
  hercules:    { label: "Deployment URL", placeholder: "https://myapp.onhercules.app", requiresSiteUrl: true },
};

// ─── Form Schema ──────────────────────────────────────────────────────────────

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  websiteUrl: z.string().min(1, "Website URL is required").url("Please enter a valid URL"),
  websiteType: z.string().min(1, "Website type is required"),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  primaryLanguage: z.string().optional(),
  businessDescription: z.string().optional(),
  primaryServices: z.string().optional(),
  products: z.string().optional(),
  primaryAudience: z.string().optional(),
  primaryConversionGoal: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

const STEPS = [
  { id: "website",  label: "Website",  icon: GlobeIcon },
  { id: "cms",      label: "CMS",      icon: LayoutGridIcon },
  { id: "business", label: "Business", icon: BuildingIcon },
  { id: "location", label: "Location", icon: MapPinIcon },
  { id: "details",  label: "Details",  icon: SettingsIcon },
] as const;

const CONVEX_SITE_URL = "https://grandiose-quail-879.convex.site";

type CmsCredState = {
  siteUrl: string;
  credentials: string;
  extraField: string;
  authMethod: "app_password" | "admin_login" | "webhook";
  wpUsername: string;
  wpPassword: string;
  webhookSecret: string;
};

type TestStatus = "idle" | "testing" | "success" | "error";

const DEFAULT_CRED: CmsCredState = {
  siteUrl: "", credentials: "", extraField: "",
  authMethod: "app_password", wpUsername: "", wpPassword: "", webhookSecret: "",
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function CreateProjectWizard({ onSuccess }: { onSuccess?: () => void }) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCms, setSelectedCms] = useState<string | null>(null);
  const [usesCms, setUsesCms] = useState<boolean | null>(null);
  const [cmsCredState, setCmsCredState] = useState<CmsCredState>(DEFAULT_CRED);

  // Connection test state
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  // Completion screen
  const [completed, setCompleted] = useState(false);

  const createProject = useMutation(api.projects.create);
  const saveConnection = useMutation(api.cms.mutations.saveConnection);
  const generateWebhookSecret = useAction(api.cms.actions.generateWebhookSecret);
  const testWpAppPassword = useAction(api.cms.actions.testWordPressConnection);
  const testWpAdminLogin = useAction(api.cms.actions.testWordPressAdminLogin);
  const testWebflow = useAction(api.cms.actions.testWebflowConnection);
  const testWix = useAction(api.cms.actions.testWixConnection);

  const navigate = useNavigate();
  const { setActiveProjectId } = useCurrentProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "", websiteUrl: "", websiteType: "", businessName: "",
      businessCategory: "", country: "", state: "", district: "", city: "",
      primaryLanguage: "en", businessDescription: "", primaryServices: "",
      products: "", primaryAudience: "", primaryConversionGoal: "",
      contactEmail: "", notes: "",
    },
  });

  function updateCred(patch: Partial<CmsCredState>) {
    setCmsCredState((prev) => ({ ...prev, ...patch }));
    // Reset test status when credentials change
    const credFields: Array<keyof CmsCredState> = ["siteUrl", "credentials", "extraField", "wpUsername", "wpPassword", "authMethod"];
    if (credFields.some((k) => k in patch)) {
      setTestStatus("idle");
      setTestError(null);
      setTestSuccessMsg(null);
    }
  }

  async function genWebhookSecret() {
    const { secret } = await generateWebhookSecret({});
    updateCred({ webhookSecret: secret });
    // Webhook auth: generating secret counts as "connected"
    setTestStatus("success");
    setTestSuccessMsg("Webhook secret ready — configure WP Webhooks plugin after project creation");
    toast.success("Webhook secret generated");
  }

  // ── CMS Connection Test ────────────────────────────────────────────────────

  async function handleTestConnection() {
    const platform = selectedCms ? CMS_PLATFORMS.find((p) => p.id === selectedCms) : null;
    if (!platform) return;

    setTestStatus("testing");
    setTestError(null);
    setTestSuccessMsg(null);

    try {
      const siteUrl = cmsCredState.siteUrl.replace(/\/$/, "");

      if (platform.id === "wordpress") {
        const { authMethod, wpUsername, wpPassword } = cmsCredState;
        if (!siteUrl) throw new Error("Enter the WordPress site URL");

        if (authMethod === "app_password") {
          if (!wpUsername.trim() || !wpPassword.trim()) throw new Error("Enter your username and Application Password");
          const creds = btoa(`${wpUsername.trim()}:${wpPassword.replace(/\s/g, "")}`);
          const r = await testWpAppPassword({ siteUrl, credentials: creds });
          setTestSuccessMsg(`Connected to "${r.siteName}" as ${r.user}`);

        } else if (authMethod === "admin_login") {
          if (!wpUsername.trim() || !wpPassword.trim()) throw new Error("Enter your admin username and password");
          const r = await testWpAdminLogin({ siteUrl, username: wpUsername, password: wpPassword });
          setTestSuccessMsg(`Connected to "${r.siteName}" as ${r.user}`);

        } else {
          // webhook — no remote test, just check secret
          if (!cmsCredState.webhookSecret) throw new Error("Generate a webhook secret first");
          setTestSuccessMsg("Webhook secret ready — configure WP Webhooks plugin after project creation");
        }

      } else if (platform.id === "webflow") {
        if (!cmsCredState.credentials.trim()) throw new Error("Enter your Webflow API token");
        const r = await testWebflow({ apiToken: cmsCredState.credentials.trim() });
        setTestSuccessMsg(`Connected as ${r.user} — ${r.sites.length} site(s) found`);

      } else if (platform.id === "wix") {
        if (!cmsCredState.credentials.trim()) throw new Error("Enter your Wix API key");
        if (!cmsCredState.extraField.trim()) throw new Error("Enter your Wix Site ID");
        const r = await testWix({ apiKey: cmsCredState.credentials.trim(), siteId: cmsCredState.extraField.trim() });
        setTestSuccessMsg(`Connected to "${r.siteName}"`);

      } else {
        // Generic — validate fields filled then accept
        const cfg = CMS_CRED_CONFIG[platform.id];
        if (cfg?.requiresSiteUrl && !siteUrl) throw new Error(`Enter the ${platform.name} site URL`);
        if (!cmsCredState.credentials.trim()) throw new Error(`Enter your ${cfg?.label ?? "credentials"}`);
        if (cfg?.extraField && !cmsCredState.extraField.trim()) throw new Error(`Enter ${cfg.extraField.label}`);
        setTestSuccessMsg(`Credentials saved for ${platform.name} — will be verified on first sync`);
      }

      setTestStatus("success");
    } catch (e) {
      setTestStatus("error");
      if (e instanceof ConvexError) {
        setTestError((e.data as { message: string }).message);
      } else if (e instanceof Error) {
        setTestError(e.message);
      } else {
        setTestError("Connection test failed — check your credentials and try again");
      }
    }
  }

  // ── Step Navigation ────────────────────────────────────────────────────────

  async function handleNext() {
    if (step === 0) {
      const valid = await form.trigger(["name", "websiteUrl", "websiteType"]);
      if (!valid) return;
    }

    if (step === 1) {
      // CMS step validation
      if (usesCms === null) {
        toast.error("Please choose whether your site uses a CMS");
        return;
      }
      if (usesCms === true) {
        if (!selectedCms) {
          toast.error("Please select your CMS platform");
          return;
        }
        const platform = CMS_PLATFORMS.find((p) => p.id === selectedCms);
        if (platform?.connectable) {
          if (testStatus !== "success") {
            toast.error("Please test your connection and ensure it passes before continuing");
            return;
          }
        }
      }
    }

    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function onSubmit(data: ProjectFormValues) {
    // Guard: only submit on the final step (pressing Enter in an input on earlier
    // steps also fires the form's onSubmit — we must not create a project early)
    if (step !== STEPS.length - 1) {
      void handleNext();
      return;
    }
    setIsSubmitting(true);
    try {
      const targetLocations = data.country
        ? [{ country: data.country, state: data.state || undefined, district: data.district || undefined, city: data.city || undefined, isPrimary: true }]
        : undefined;

      const projectId = await createProject({
        name: data.name, websiteUrl: data.websiteUrl, websiteType: data.websiteType,
        businessName: data.businessName || undefined, businessCategory: data.businessCategory || undefined,
        country: data.country || undefined, state: data.state || undefined,
        district: data.district || undefined, city: data.city || undefined,
        primaryLanguage: data.primaryLanguage || undefined, businessDescription: data.businessDescription || undefined,
        primaryServices: data.primaryServices || undefined, products: data.products || undefined,
        primaryAudience: data.primaryAudience || undefined, primaryConversionGoal: data.primaryConversionGoal || undefined,
        contactEmail: data.contactEmail || undefined, notes: data.notes || undefined, targetLocations,
      });

      setActiveProjectId(projectId);

      // Save CMS connection if test passed
      const platform = selectedCms ? CMS_PLATFORMS.find((p) => p.id === selectedCms) : null;
      if (platform?.connectable && testStatus === "success") {
        try {
          let credentials = "";
          let authMethod: "app_password" | "admin_login" | "webhook" | undefined;
          let webhookSecret: string | undefined;
          const siteUrl = (cmsCredState.siteUrl || data.websiteUrl).replace(/\/$/, "");

          if (platform.id === "wordpress") {
            authMethod = cmsCredState.authMethod;
            if (cmsCredState.authMethod === "webhook") {
              credentials = siteUrl;
              webhookSecret = cmsCredState.webhookSecret;
            } else {
              credentials = btoa(`${cmsCredState.wpUsername.trim()}:${cmsCredState.wpPassword.replace(/\s/g, "")}`);
            }
          } else if (platform.id === "webflow" || platform.id === "wix") {
            const cfg = CMS_CRED_CONFIG[platform.id];
            credentials = cmsCredState.credentials.trim();
            if (cfg?.extraField && cmsCredState.extraField.trim()) {
              credentials = JSON.stringify({ token: credentials, [cfg.extraField.label.toLowerCase().replace(/[\s()]+/g, "_").replace(/_$/, "")]: cmsCredState.extraField.trim() });
            }
          } else {
            const cfg = CMS_CRED_CONFIG[platform.id];
            credentials = cmsCredState.credentials.trim();
            if (cfg?.extraField && cmsCredState.extraField.trim()) {
              credentials = JSON.stringify({ token: credentials, [cfg.extraField.label.toLowerCase().replace(/\s/g, "_")]: cmsCredState.extraField.trim() });
            }
          }

          await saveConnection({ projectId, platform: platform.id, siteUrl: siteUrl || data.websiteUrl, credentials: credentials || siteUrl, authMethod, webhookSecret });
        } catch {
          // Non-fatal — connection saved, user can fix from settings
        }
      }

      setCompleted(true);
    } catch (error) {
      if (error instanceof ConvexError) {
        toast.error((error.data as { message: string }).message);
      } else {
        toast.error("Failed to create project");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const cmsCategories = Array.from(new Set(CMS_PLATFORMS.map((p) => p.category)));
  const selectedPlatform = selectedCms ? CMS_PLATFORMS.find((p) => p.id === selectedCms) ?? null : null;

  // Does current platform require a test before proceeding?
  const requiresTest = selectedPlatform?.connectable === true;
  // Is the "Next" button on step 1 allowed?
  const cmsStepCanProceed = (
    usesCms === false ||
    (usesCms === true && selectedCms !== null && (!requiresTest || testStatus === "success"))
  );

  // ── Completion Screen ──────────────────────────────────────────────────────

  if (completed) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/40">
            <CheckCircleIcon className="h-9 w-9 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold">Project created!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {form.getValues("name")} is ready.
              {selectedPlatform?.connectable && testStatus === "success" ? ` ${selectedPlatform.name} connected.` : ""}
            </p>
          </div>
        </div>
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <ScanSearchIcon className="h-5 w-5 text-primary" />
            <p className="font-semibold">Run your first SEO audit?</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover technical issues, missing metadata, broken links, and Core Web Vitals problems on <strong>{form.getValues("websiteUrl")}</strong>
          </p>
          <div className="flex gap-3 justify-center pt-1">
            <Button onClick={() => { if (onSuccess) onSuccess(); navigate("/audit"); }} size="sm" className="gap-2">
              <RocketIcon className="h-4 w-4" />Run Audit Now
            </Button>
            <Button onClick={() => { if (onSuccess) onSuccess(); navigate("/projects"); }} variant="secondary" size="sm">
              Skip for now <ChevronRightIcon className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Step indicator */}
      <nav className="flex items-center justify-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { if (i < step) setStep(i); }}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              i === step ? "bg-primary text-primary-foreground"
                : i < step ? "bg-primary/10 text-primary cursor-pointer"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i < step ? <CheckIcon className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{s.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        ))}
      </nav>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

          {/* ── Step 1: Website ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Website details</h3>
                <p className="text-sm text-muted-foreground">Enter the website you want to audit and optimize.</p>
              </div>
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Project name</FormLabel><FormControl><Input placeholder="My Website SEO" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input placeholder="https://example.com" type="url" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="websiteType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>{WEBSITE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* ── Step 2: CMS ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Is your website built on a CMS?</h3>
                <p className="text-sm text-muted-foreground">Connecting your CMS unlocks content management, sitemaps, and AI-powered internal linking.</p>
              </div>

              {/* Yes / No */}
              {usesCms === null && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { val: true,  icon: "🔌", title: "Yes, I use a CMS", desc: "Connect & verify credentials now" },
                    { val: false, icon: "🔧", title: "No, custom site",  desc: "Continue without CMS integration" },
                  ].map(({ val, icon, title, desc }) => (
                    <button key={String(val)} type="button" onClick={() => setUsesCms(val)}
                      className="rounded-xl border-2 border-border p-5 text-left hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
                      <div className="text-3xl mb-2">{icon}</div>
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* CMS picker + mandatory credential test */}
              {usesCms === true && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Select your CMS platform <span className="text-red-500">*</span></p>
                    <button type="button" onClick={() => { setUsesCms(null); setSelectedCms(null); setCmsCredState(DEFAULT_CRED); setTestStatus("idle"); setTestError(null); setTestSuccessMsg(null); }}
                      className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">← Change</button>
                  </div>

                  {cmsCategories.map((cat) => {
                    const platforms = CMS_PLATFORMS.filter((p) => p.category === cat);
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{CATEGORY_LABELS[cat]}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {platforms.map((p) => (
                            <button key={p.id} type="button"
                              onClick={() => { setSelectedCms(p.id === selectedCms ? null : p.id); setCmsCredState(DEFAULT_CRED); setTestStatus("idle"); setTestError(null); setTestSuccessMsg(null); }}
                              className={cn(
                                "rounded-xl border-2 px-3 py-2.5 text-left transition-all cursor-pointer flex items-center gap-2.5",
                                selectedCms === p.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : `border-border hover:border-primary/40 ${p.color}`,
                              )}
                            >
                              <span className="text-xl shrink-0">{p.icon}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{p.name}</p>
                                {p.connectable
                                  ? <span className="text-[10px] text-green-700 dark:text-green-400 flex items-center gap-0.5"><WifiIcon className="h-2.5 w-2.5" />API ready</span>
                                  : <span className="text-[10px] text-muted-foreground">Coming soon</span>
                                }
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Mandatory credential + test form */}
                  {selectedPlatform?.connectable && (
                    <div className={cn("rounded-xl border-2 p-5 space-y-4", selectedPlatform.color, "border-primary/40")}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{selectedPlatform.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">Connect {selectedPlatform.name} <span className="text-red-500 text-xs">— required to continue</span></p>
                          <p className="text-xs text-muted-foreground">Enter your credentials and test the connection</p>
                        </div>
                      </div>

                      {selectedPlatform.id === "wordpress" ? (
                        <WordPressInlineForm
                          state={cmsCredState}
                          onChange={updateCred}
                          onGenerateSecret={genWebhookSecret}
                          onTest={handleTestConnection}
                          testStatus={testStatus}
                          testError={testError}
                          testSuccessMsg={testSuccessMsg}
                        />
                      ) : (
                        <GenericInlineForm
                          platform={selectedPlatform}
                          cfg={CMS_CRED_CONFIG[selectedPlatform.id]}
                          state={cmsCredState}
                          onChange={updateCred}
                          onTest={handleTestConnection}
                          testStatus={testStatus}
                          testError={testError}
                          testSuccessMsg={testSuccessMsg}
                          hasApiTest={PLATFORMS_WITH_API_TEST.has(selectedPlatform.id)}
                        />
                      )}
                    </div>
                  )}

                  {/* Non-connectable platform notice */}
                  {selectedPlatform && !selectedPlatform.connectable && (
                    <div className="rounded-xl border-2 border-border bg-muted/30 p-4 flex items-start gap-3">
                      <span className="text-2xl">{selectedPlatform.icon}</span>
                      <div>
                        <p className="font-semibold text-sm">{selectedPlatform.name} selected</p>
                        <p className="text-xs text-muted-foreground mt-0.5">API integration for {selectedPlatform.name} is coming soon. All audits, keyword research, and GSC features are fully available.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No CMS — static framework picker */}
              {usesCms === false && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">What framework is your site on? (optional)</p>
                    <button type="button" onClick={() => { setUsesCms(null); setSelectedCms(null); }} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">← Change</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CMS_PLATFORMS.filter((p) => p.category === "static").map((p) => (
                      <button key={p.id} type="button" onClick={() => setSelectedCms(p.id === selectedCms ? null : p.id)}
                        className={cn("rounded-xl border-2 px-3 py-2.5 text-left transition-all cursor-pointer flex items-center gap-2.5",
                          selectedCms === p.id ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/40 bg-muted/30")}>
                        <span className="text-xl shrink-0">{p.icon}</span>
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                      </button>
                    ))}
                    <button type="button" onClick={() => setSelectedCms("custom")}
                      className={cn("rounded-xl border-2 px-3 py-2.5 text-left transition-all cursor-pointer flex items-center gap-2.5",
                        selectedCms === "custom" ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary/40 bg-muted/30")}>
                      <span className="text-xl shrink-0">🔧</span>
                      <p className="text-xs font-semibold">Custom / Other</p>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">All Maxentrix features (audits, keyword research, GSC, and more) are fully available.</p>
                </div>
              )}

              {/* Hint when connectable selected but test not done */}
              {usesCms === true && selectedPlatform?.connectable && testStatus === "idle" && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                  <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                  You must test the connection successfully before proceeding to the next step.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Business ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Business information</h3>
                <p className="text-sm text-muted-foreground">Help us tailor SEO recommendations to your business. All fields are optional.</p>
              </div>
              <FormField control={form.control} name="businessName" render={({ field }) => (
                <FormItem><FormLabel>Business name</FormLabel><FormControl><Input placeholder="Acme Inc." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="businessCategory" render={({ field }) => (
                <FormItem><FormLabel>Business category</FormLabel><FormControl><Input placeholder="Digital marketing agency" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="businessDescription" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Briefly describe what your business does..." className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="primaryServices" render={({ field }) => (
                  <FormItem><FormLabel>Primary services</FormLabel><FormControl><Input placeholder="SEO, web design" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="products" render={({ field }) => (
                  <FormItem><FormLabel>Products</FormLabel><FormControl><Input placeholder="SaaS tools, courses" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
          )}

          {/* ── Step 4: Location ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Location & targeting</h3>
                <p className="text-sm text-muted-foreground">Where is your business located and which regions do you target?</p>
              </div>
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="United States" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input placeholder="California" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem><FormLabel>District / County</FormLabel><FormControl><Input placeholder="Los Angeles County" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Los Angeles" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="primaryLanguage" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary language</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                    <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          )}

          {/* ── Step 5: Details ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Additional details</h3>
                <p className="text-sm text-muted-foreground">Final details to fine-tune your SEO recommendations.</p>
              </div>
              <FormField control={form.control} name="primaryAudience" render={({ field }) => (
                <FormItem><FormLabel>Primary audience</FormLabel><FormControl><Input placeholder="Small business owners, marketers" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="primaryConversionGoal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary conversion goal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select goal" /></SelectTrigger></FormControl>
                    <SelectContent>{CONVERSION_GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="contactEmail" render={({ field }) => (
                <FormItem><FormLabel>Contact email</FormLabel><FormControl><Input placeholder="team@example.com" type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Any additional notes about this project..." className="min-h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              {selectedPlatform && (
                <div className={cn("rounded-xl border p-3 flex items-center gap-3", testStatus === "success" ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-muted/30")}>
                  <span className="text-xl">{selectedPlatform.icon}</span>
                  <div>
                    <p className="text-xs font-semibold">CMS: {selectedPlatform.name}</p>
                    {testStatus === "success"
                      ? <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1"><CheckCircleIcon className="h-3 w-3" />Connection verified — will be saved with this project</p>
                      : <p className="text-xs text-muted-foreground">Platform noted — no connection</p>
                    }
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button type="button" variant="ghost" onClick={handleBack} disabled={step === 0}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext}
                disabled={step === 1 && usesCms === true && selectedPlatform?.connectable === true && testStatus !== "success"}>
                Next <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create project"}
                <CheckIcon className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}

// ─── Test Status Banner ───────────────────────────────────────────────────────

function TestStatusBanner({ status, error, successMsg, onSwitchToWebhook }: {
  status: TestStatus;
  error: string | null;
  successMsg: string | null;
  onSwitchToWebhook?: () => void;
}) {
  if (status === "idle") return null;
  if (status === "testing") return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border">
      <RefreshCwIcon className="h-3.5 w-3.5 animate-spin" />Testing connection…
    </div>
  );
  if (status === "success") return (
    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 rounded-lg px-3 py-2.5 border border-green-200 dark:border-green-800">
      <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" /><span>{successMsg ?? "Connection successful"}</span>
    </div>
  );
  // Special: server is stripping Authorization header
  if (error === "AUTH_HEADER_STRIPPED") {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />Your server is blocking the connection
        </p>
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          Your host (Apache + PHP-FPM) is stripping the <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">Authorization</code> header before it reaches WordPress. This is common on shared hosting.
        </p>
        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">Fix option 1 — add to your <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">.htaccess</code>:</p>
        <pre className="text-[10px] bg-amber-100 dark:bg-amber-900/30 rounded px-2 py-1.5 font-mono overflow-x-auto select-all">
{`RewriteEngine On
RewriteCond %{HTTP:Authorization} ^(.*)
RewriteRule .* - [e=HTTP_AUTHORIZATION:%1]`}
        </pre>
        {onSwitchToWebhook && (
          <button type="button" onClick={onSwitchToWebhook}
            className="text-[11px] underline text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer">
            Fix option 2 — switch to Webhook method instead →
          </button>
        )}
      </div>
    );
  }
  // Generic error
  return (
    <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2.5 border border-red-200 dark:border-red-800">
      <XCircleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>{error ?? "Connection failed — check your credentials"}</span>
    </div>
  );
}

// ─── WordPress Inline Form ────────────────────────────────────────────────────

function WordPressInlineForm({ state, onChange, onGenerateSecret, onTest, testStatus, testError, testSuccessMsg }: {
  state: CmsCredState;
  onChange: (patch: Partial<CmsCredState>) => void;
  onGenerateSecret: () => Promise<void>;
  onTest: () => Promise<void>;
  testStatus: TestStatus;
  testError: string | null;
  testSuccessMsg: string | null;
}) {
  const [generating, setGenerating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    await onGenerateSecret().finally(() => setGenerating(false));
  }

  const webhookUrl = state.webhookSecret ? `${CONVEX_SITE_URL}/wp-webhook?projectId=PROJECT_ID&secret=${state.webhookSecret}` : "";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">WordPress Site URL <span className="text-red-500">*</span></Label>
        <Input value={state.siteUrl} onChange={(e) => onChange({ siteUrl: e.target.value })} placeholder="https://yourblog.com" />
      </div>

      <Tabs value={state.authMethod} onValueChange={(v) => { onChange({ authMethod: v as "app_password" | "admin_login" | "webhook" }); setShowPassword(false); }}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="app_password" className="text-xs gap-1"><KeyRoundIcon className="h-3 w-3" />App Password</TabsTrigger>
          <TabsTrigger value="admin_login" className="text-xs gap-1"><UserCircleIcon className="h-3 w-3" />Admin Login</TabsTrigger>
          <TabsTrigger value="webhook" className="text-xs gap-1"><WebhookIcon className="h-3 w-3" />Webhook</TabsTrigger>
        </TabsList>

        <TabsContent value="app_password" className="space-y-2.5 pt-3">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2.5 text-[11px] text-blue-700 dark:text-blue-400">
            <p className="font-semibold flex items-center gap-1"><InfoIcon className="h-3 w-3" />WP Admin → Users → Profile → Application Passwords → Add New → name it "Maxentrix"</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Username <span className="text-red-500">*</span></Label>
            <Input value={state.wpUsername} onChange={(e) => onChange({ wpUsername: e.target.value })} placeholder="your_wp_username" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Application Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={state.wpPassword}
                onChange={(e) => onChange({ wpPassword: e.target.value })}
                placeholder="xxxx xxxx xxxx xxxx xxxx"
                className="pr-9"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="admin_login" className="space-y-2.5 pt-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
            <p className="font-semibold">Enter your regular WordPress admin username and password</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Admin Username <span className="text-red-500">*</span></Label>
            <Input value={state.wpUsername} onChange={(e) => onChange({ wpUsername: e.target.value })} placeholder="admin" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Admin Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={state.wpPassword}
                onChange={(e) => onChange({ wpPassword: e.target.value })}
                placeholder="Your WordPress password"
                className="pr-9"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-2.5 pt-3">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-2.5 text-[11px] text-green-700 dark:text-green-400">
            <p className="font-semibold flex items-center gap-1"><ZapIcon className="h-3 w-3" />No password needed — generate a secret, then install WP Webhooks plugin and paste the URL</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Webhook Secret <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Input value={state.webhookSecret} readOnly placeholder="Click Generate" className="font-mono text-xs" />
              <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={generating} className="shrink-0">
                {generating ? <RefreshCwIcon className="h-3 w-3 animate-spin" /> : <RefreshCwIcon className="h-3 w-3" />}
                {generating ? "" : "Generate"}
              </Button>
            </div>
          </div>
          {webhookUrl && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Webhook URL (paste into WP Webhooks plugin)</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-[10px] bg-muted" />
                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => { void navigator.clipboard.writeText(webhookUrl); toast.success("Copied"); }}>
                  <CopyIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TestStatusBanner status={testStatus} error={testError} successMsg={testSuccessMsg} onSwitchToWebhook={() => onChange({ authMethod: "webhook" })} />

      {state.authMethod !== "webhook" && (
        <Button type="button" onClick={onTest} disabled={testStatus === "testing"} className="w-full gap-2" variant={testStatus === "success" ? "secondary" : "default"}>
          {testStatus === "testing" ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : testStatus === "success" ? <CheckCircleIcon className="h-4 w-4" /> : <WifiIcon className="h-4 w-4" />}
          {testStatus === "testing" ? "Testing…" : testStatus === "success" ? "Connection verified — test again?" : "Test Connection"}
        </Button>
      )}
    </div>
  );
}

// ─── Generic Inline Form ──────────────────────────────────────────────────────

function GenericInlineForm({ platform, cfg, state, onChange, onTest, testStatus, testError, testSuccessMsg, hasApiTest }: {
  platform: CmsPlatform;
  cfg: typeof CMS_CRED_CONFIG[string] | undefined;
  state: CmsCredState;
  onChange: (patch: Partial<CmsCredState>) => void;
  onTest: () => Promise<void>;
  testStatus: TestStatus;
  testError: string | null;
  testSuccessMsg: string | null;
  hasApiTest: boolean;
}) {
  if (!cfg) return null;
  return (
    <div className="space-y-3">
      {cfg.requiresSiteUrl && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{platform.name} Site URL <span className="text-red-500">*</span></Label>
          <Input value={state.siteUrl} onChange={(e) => onChange({ siteUrl: e.target.value })} placeholder={cfg.siteUrlPlaceholder ?? `https://your-${platform.id}-site.com`} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{cfg.label} <span className="text-red-500">*</span></Label>
        <Input type="password" value={state.credentials} onChange={(e) => onChange({ credentials: e.target.value })} placeholder={cfg.placeholder} autoComplete="off" />
      </div>
      {cfg.extraField && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{cfg.extraField.label} <span className="text-red-500">*</span></Label>
          <Input value={state.extraField} onChange={(e) => onChange({ extraField: e.target.value })} placeholder={cfg.extraField.placeholder} />
        </div>
      )}

      <TestStatusBanner status={testStatus} error={testError} successMsg={testSuccessMsg} />

      <Button type="button" onClick={onTest} disabled={testStatus === "testing"} className="w-full gap-2" variant={testStatus === "success" ? "secondary" : "default"}>
        {testStatus === "testing" ? <RefreshCwIcon className="h-4 w-4 animate-spin" /> : testStatus === "success" ? <CheckCircleIcon className="h-4 w-4" /> : <WifiIcon className="h-4 w-4" />}
        {testStatus === "testing" ? "Testing…" : testStatus === "success" ? "Connection verified — test again?" : hasApiTest ? "Test Connection" : "Verify Credentials"}
      </Button>

      {!hasApiTest && testStatus === "idle" && (
        <p className="text-[11px] text-muted-foreground text-center">
          Clicking "Verify Credentials" saves your credentials — a live API ping will run on first sync.
        </p>
      )}
    </div>
  );
}
