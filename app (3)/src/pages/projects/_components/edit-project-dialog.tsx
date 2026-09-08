import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { WEBSITE_TYPES, CONVERSION_GOALS, LANGUAGES } from "@/lib/constants.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

const editSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  websiteUrl: z.string().min(1, "Website URL is required").url("Please enter a valid URL"),
  websiteType: z.string().min(1, "Website type is required"),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  businessDescription: z.string().optional(),
  primaryServices: z.string().optional(),
  products: z.string().optional(),
  primaryAudience: z.string().optional(),
  primaryConversionGoal: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  country: z.string().optional(),
  state: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  primaryLanguage: z.string().optional(),
  notes: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

type Props = {
  project: Doc<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EditProjectDialog({ project, open, onOpenChange }: Props) {
  const updateProject = useMutation(api.projects.update);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: project.name,
      websiteUrl: project.websiteUrl,
      websiteType: project.websiteType,
      businessName: project.businessName ?? "",
      businessCategory: project.businessCategory ?? "",
      businessDescription: project.businessDescription ?? "",
      primaryServices: project.primaryServices ?? "",
      products: project.products ?? "",
      primaryAudience: project.primaryAudience ?? "",
      primaryConversionGoal: project.primaryConversionGoal ?? "",
      contactEmail: project.contactEmail ?? "",
      country: project.country ?? "",
      state: project.state ?? "",
      district: project.district ?? "",
      city: project.city ?? "",
      primaryLanguage: project.primaryLanguage ?? "en",
      notes: project.notes ?? "",
    },
  });

  // Reset form when project changes
  useEffect(() => {
    form.reset({
      name: project.name,
      websiteUrl: project.websiteUrl,
      websiteType: project.websiteType,
      businessName: project.businessName ?? "",
      businessCategory: project.businessCategory ?? "",
      businessDescription: project.businessDescription ?? "",
      primaryServices: project.primaryServices ?? "",
      products: project.products ?? "",
      primaryAudience: project.primaryAudience ?? "",
      primaryConversionGoal: project.primaryConversionGoal ?? "",
      contactEmail: project.contactEmail ?? "",
      country: project.country ?? "",
      state: project.state ?? "",
      district: project.district ?? "",
      city: project.city ?? "",
      primaryLanguage: project.primaryLanguage ?? "en",
      notes: project.notes ?? "",
    });
  }, [project, form]);

  async function onSubmit(data: EditFormValues) {
    try {
      await updateProject({
        projectId: project._id,
        name: data.name,
        websiteUrl: data.websiteUrl,
        websiteType: data.websiteType,
        businessName: data.businessName || undefined,
        businessCategory: data.businessCategory || undefined,
        businessDescription: data.businessDescription || undefined,
        primaryServices: data.primaryServices || undefined,
        products: data.products || undefined,
        primaryAudience: data.primaryAudience || undefined,
        primaryConversionGoal: data.primaryConversionGoal || undefined,
        contactEmail: data.contactEmail || undefined,
        country: data.country || undefined,
        state: data.state || undefined,
        district: data.district || undefined,
        city: data.city || undefined,
        primaryLanguage: data.primaryLanguage || undefined,
        notes: data.notes || undefined,
      });
      toast.success("Project updated");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Failed to update project");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit project — {project.name}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="website">
              <TabsList className="w-full">
                <TabsTrigger value="website" className="flex-1">Website</TabsTrigger>
                <TabsTrigger value="business" className="flex-1">Business</TabsTrigger>
                <TabsTrigger value="location" className="flex-1">Location</TabsTrigger>
                <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              </TabsList>

              {/* Website tab */}
              <TabsContent value="website" className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project name</FormLabel>
                    <FormControl><Input placeholder="My Website SEO" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com" type="url" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="websiteType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WEBSITE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* Business tab */}
              <TabsContent value="business" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="businessName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business name</FormLabel>
                      <FormControl><Input placeholder="Acme Inc." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="businessCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl><Input placeholder="Digital marketing" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="businessDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="What does your business do?" className="min-h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="primaryServices" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary services</FormLabel>
                      <FormControl><Input placeholder="SEO, web design" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="products" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Products</FormLabel>
                      <FormControl><Input placeholder="SaaS tools, courses" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              {/* Location tab */}
              <TabsContent value="location" className="space-y-4 pt-4">
                <FormField control={form.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input placeholder="United States" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl><Input placeholder="California" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem>
                      <FormLabel>District / County</FormLabel>
                      <FormControl><Input placeholder="LA County" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input placeholder="Los Angeles" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="primaryLanguage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary language</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select language" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>

              {/* Details tab */}
              <TabsContent value="details" className="space-y-4 pt-4">
                <FormField control={form.control} name="primaryAudience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary audience</FormLabel>
                    <FormControl><Input placeholder="Small business owners, marketers" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="primaryConversionGoal" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary conversion goal</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Select goal" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONVERSION_GOALS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl><Input placeholder="team@example.com" type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl><Textarea placeholder="Any notes about this project..." className="min-h-20" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
