import { Outlet } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar.tsx";
import AppSidebar from "./app-sidebar.tsx";
import AppHeader from "./app-header.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { RadarIcon } from "lucide-react";
import { ProjectProvider } from "@/hooks/use-current-project.tsx";

export default function AppLayout() {
  return (
    <>
      <AuthLoading>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <RadarIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-3 w-48">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          </div>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center space-y-6 max-w-sm px-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <RadarIcon className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Maxentrix SEO Platform
              </h1>
              <p className="text-muted-foreground">
                Sign in to access your SEO workspace
              </p>
            </div>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <Authenticated>
        <ProjectProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <div className="flex-1 overflow-auto">
                <Outlet />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </ProjectProvider>
      </Authenticated>
    </>
  );
}
