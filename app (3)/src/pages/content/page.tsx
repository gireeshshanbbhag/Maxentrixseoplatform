import { useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentProject } from "@/hooks/use-current-project.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { PenToolIcon, PlusIcon } from "lucide-react";
import ContentList from "./_components/content-list.tsx";
import ContentEditor from "./_components/content-editor.tsx";
import ContentAnalyzerPanel from "./_components/content-analyzer-panel.tsx";
import ContentCalendar from "./_components/content-calendar.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Tab = "list" | "editor" | "analyzer" | "calendar";

function ContentContent() {
  const { activeProjectId } = useCurrentProject();
  const projects = useQuery(api.projects.list, {});
  const project = projects?.find((p) => p._id === activeProjectId);

  const [activeTab, setActiveTab] = useState<Tab>("list");
  const [editingId, setEditingId] = useState<Id<"contentPieces"> | null>(null);
  const [prefillTitle, setPrefillTitle] = useState<string | undefined>();
  const [prefillKeyword, setPrefillKeyword] = useState<string | undefined>();

  if (projects === undefined) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <PenToolIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold">No project selected</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a project to manage content.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "list", label: "Content" },
    { id: "editor", label: "Writer" },
    { id: "analyzer", label: "Analyzer" },
    { id: "calendar", label: "Calendar" },
  ];

  function openEditor(id?: Id<"contentPieces">, title?: string, keyword?: string) {
    setEditingId(id ?? null);
    setPrefillTitle(title);
    setPrefillKeyword(keyword);
    setActiveTab("editor");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="border-b px-6 flex items-center gap-1 overflow-x-auto shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== "editor") setEditingId(null);
            }}
            className={`px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto pl-4 py-2 shrink-0">
          <Button size="sm" onClick={() => openEditor()} className="cursor-pointer">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            New content
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "list" && (
          <ContentList project={project} onEdit={openEditor} />
        )}
        {activeTab === "editor" && (
          <ContentEditor
            project={project}
            pieceId={editingId}
            onClose={() => setActiveTab("list")}
            prefillTitle={prefillTitle}
            prefillKeyword={prefillKeyword}
          />
        )}
        {activeTab === "analyzer" && (
          <ContentAnalyzerPanel project={project} />
        )}
        {activeTab === "calendar" && (
          <ContentCalendar project={project} onEdit={(id) => openEditor(id)} />
        )}
      </div>
    </div>
  );
}

export default function ContentPage() {
  return (
    <>
      <AuthLoading><div className="p-6"><Skeleton className="h-40 w-full" /></div></AuthLoading>
      <Unauthenticated><div className="p-6 text-center"><SignInButton /></div></Unauthenticated>
      <Authenticated><ContentContent /></Authenticated>
    </>
  );
}
