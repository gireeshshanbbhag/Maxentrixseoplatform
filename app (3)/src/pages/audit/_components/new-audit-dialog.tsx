import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Button } from "@/components/ui/button.tsx";

const formSchema = z.object({
  maxPages: z
    .number()
    .min(1, "Must be at least 1")
    .max(500, "Maximum is 500"),
  maxDepth: z
    .number()
    .min(1, "Must be at least 1")
    .max(10, "Maximum is 10"),
  includePaths: z.string(),
  excludePaths: z.string(),
  respectRobotsTxt: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type NewAuditDialogProps = {
  projectId: Id<"projects">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NewAuditDialog({
  projectId,
  open,
  onOpenChange,
}: NewAuditDialogProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createAudit = useMutation(api.audits.queries.create);
  const startAudit = useMutation(api.audits.actions.startAudit);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      maxPages: 100,
      maxDepth: 5,
      includePaths: "",
      excludePaths: "",
      respectRobotsTxt: true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const includePaths = values.includePaths
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const excludePaths = values.excludePaths
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const auditId = await createAudit({
        projectId,
        maxPages: values.maxPages,
        maxDepth: values.maxDepth,
        includePaths,
        excludePaths,
        respectRobotsTxt: values.respectRobotsTxt,
      });

      await startAudit({ auditId });
      onOpenChange(false);
      form.reset();
      navigate(`/audit/${auditId}`);
      toast.success("Audit started successfully");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { code: string; message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to start audit");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Site Audit</DialogTitle>
          <DialogDescription>
            Configure crawl settings for this audit. Default settings work well
            for most sites.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max pages</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max depth</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="includePaths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Include paths</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"/blog\n/products"}
                      className="min-h-[72px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    One path per line. Leave empty to crawl the entire site.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="excludePaths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclude paths</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={"/admin\n/api"}
                      className="min-h-[72px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    One path per line. These paths will be skipped during crawl.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="respectRobotsTxt"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Respect robots.txt directives
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                {isSubmitting && (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                )}
                {isSubmitting ? "Starting..." : "Start Audit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
