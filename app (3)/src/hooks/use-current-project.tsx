import { createContext, useContext, useState, useCallback } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type ProjectContextValue = {
  activeProjectId: Id<"projects"> | null;
  setActiveProjectId: (id: Id<"projects"> | null) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY = "seo_active_project";

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] =
    useState<Id<"projects"> | null>(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (stored as Id<"projects">) : null;
    });

  const setActiveProjectId = useCallback((id: Id<"projects"> | null) => {
    setActiveProjectIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <ProjectContext.Provider value={{ activeProjectId, setActiveProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useCurrentProject must be used within a ProjectProvider");
  }
  return context;
}
