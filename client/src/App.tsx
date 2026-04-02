import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import WizardPage from "@/pages/wizard";
import JobsPage from "@/pages/jobs";
import JobViewPage from "@/pages/jobs/view";
import TemplatesPage from "@/pages/templates";
import DocumentPage from "@/pages/Document";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={WizardPage} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={SignUp} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      {/* Extract route points to wizard (same as home) */}
      <Route path="/extract" component={WizardPage} />
      
      {/* Document page - public access */}
      <Route path="/document" component={DocumentPage} />
      
      {/* Protected Routes */}
      <Route path="/jobs">
        <ProtectedRoute>
          <JobsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/jobs/:id">
        <ProtectedRoute>
          <JobViewPage />
        </ProtectedRoute>
      </Route>
      <Route path="/templates">
        <ProtectedRoute>
          <TemplatesPage />
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(location);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  // Show auth pages without sidebar
  if (isAuthPage) {
    return <Router />;
  }

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 h-full min-w-0">
          <header className="flex items-center p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm z-10 shrink-0">
            <SidebarTrigger className="hover-elevate active-elevate-2 hover:bg-muted p-2 rounded-md transition-colors" />
            <div className="ml-4 font-medium text-muted-foreground text-sm">
              CMShift
            </div>
          </header>
          <main className="flex-1 overflow-y-auto w-full relative">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
